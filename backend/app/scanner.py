import json
import logging
import subprocess
from concurrent.futures import ThreadPoolExecutor

from fastapi import HTTPException
from sqlalchemy import update
from sqlmodel import Session, select, col

from app.models import Target, Subdomain
from app.database import engine
from app.alert import send_discord_alert
from app.config import discord_webhook_url

logger = logging.getLogger(__name__)


def get_domain(target_id: int) -> str:
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        return target.url


def get_subdomains(target_id: int) -> set[str]:
    with Session(engine) as session:
        subdomains = session.exec(select(Subdomain).where(
            Subdomain.target_id == target_id)).all()
        return {subdomain.url for subdomain in subdomains}


def handle_new_subdomains(target_id: int, subdomains: set[str], titles: dict[str, str]) -> None:
    logger.info("insert new subdomains into database")
    if not subdomains:
        return
    with Session(engine) as session:
        session.add_all(
            [Subdomain(url=url, title=titles.get(url, ""), status="alive", target_id=target_id)
             for url in subdomains]
        )
        session.commit()


def handle_missing_subdomains(target_id: int, subdomains: set[str]) -> None:
    logger.info("update missing subdomains in database")
    if not subdomains:
        return
    with Session(engine) as session:
        session.exec(
            update(Subdomain)
            .where(col(Subdomain.target_id) == target_id)
            .where(col(Subdomain.url).in_(subdomains))
            .values(status="missing")
        )
        session.commit()


def run_subfinder(domain: str) -> set[str]:
    logger.info("run subfinder: domain=%s", domain)
    cmd = ["subfinder", "-silent", "-d", domain]
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        # timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)
    result = set(proc.stdout.splitlines())
    logger.info("subfinder completed: subdomains=%s", len(result))
    return result


def run_dns_filter(subdomains: set[str]) -> set[str]:
    logger.info("run dnsx: input_subdomains=%s", len(subdomains))
    if not subdomains:
        logger.info("dnsx skipped: no subdomains")
        return set()

    max_workers = min(8, len(subdomains))
    subdomain_list = list(subdomains)
    chunk_size = max(1, (len(subdomain_list) + max_workers - 1) // max_workers)
    chunks: list[list[str]] = [
        subdomain_list[i: i + chunk_size]
        for i in range(0, len(subdomain_list), chunk_size)
    ]
    logger.info(
        "dnsx start: hosts=%s workers=%s chunks=%s chunk_size=%s",
        len(subdomains),
        max_workers,
        len(chunks),
        chunk_size,
    )

    def filter_chunk(chunk_index: int, chunk: list[str]) -> str:
        logger.info("dnsx chunk[%s] start: size=%s", chunk_index, len(chunk))
        proc = subprocess.run(
            ["dnsx", "-silent"],
            input="\n".join(chunk),
            text=True,
            capture_output=True,
            # timeout=60,
        )
        if proc.returncode != 0:
            logger.error(
                "dnsx chunk[%s] failed: returncode=%s stderr=%s",
                chunk_index,
                proc.returncode,
                proc.stderr.strip(),
            )
            raise RuntimeError(proc.stderr)
        logger.info("dnsx chunk[%s] done", chunk_index)
        return proc.stdout

    outputs: list[str] = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(filter_chunk, i, chunk) for i, chunk in enumerate(chunks)]
        for future in futures:
            outputs.append(future.result())

    result: set[str] = set()
    for output in outputs:
        result.update(output.splitlines())
    logger.info("dnsx completed: alive_hosts=%s", len(result))
    return result


def run_http_probe(active_subdomains: set[str]) -> tuple[set[str], dict[str, str]]:
    logger.info("run httpx")
    if not active_subdomains:
        logger.info("http_probe skipped: no active subdomains")
        return set(), {}

    max_workers = min(8, len(active_subdomains))
    subdomain_list = list(active_subdomains)
    chunk_size = max(1, (len(subdomain_list) + max_workers - 1) // max_workers)
    chunks: list[list[str]] = [
        subdomain_list[i: i + chunk_size]
        for i in range(0, len(subdomain_list), chunk_size)
    ]
    logger.info(
        "http_probe start: hosts=%s workers=%s chunks=%s chunk_size=%s",
        len(active_subdomains),
        max_workers,
        len(chunks),
        chunk_size,
    )

    def probe_chunk(chunk_index: int, chunk: list[str]) -> str:
        logger.info("http_probe chunk[%s] start: size=%s", chunk_index, len(chunk))
        proc = subprocess.run(
            ["httpx", "-silent", "-json", "-title"],
            input="\n".join(chunk),
            text=True,
            capture_output=True,
            # timeout=120,
        )
        if proc.returncode != 0:
            logger.error(
                "http_probe chunk[%s] failed: returncode=%s stderr=%s",
                chunk_index,
                proc.returncode,
                proc.stderr.strip(),
            )
            raise RuntimeError(proc.stderr)
        logger.info("http_probe chunk[%s] done", chunk_index)
        return proc.stdout

    outputs: list[str] = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(probe_chunk, i, chunk) for i, chunk in enumerate(chunks)]
        for future in futures:
            outputs.append(future.result())

    live_urls: set[str] = set()
    titles: dict[str, str] = {}

    for output in outputs:
        for line in output.splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            url = row.get("url")
            if not url:
                continue
            live_urls.add(url)
            title = row.get("title") or ""
            titles[url] = title

    logger.info("http_probe completed: live_urls=%s", len(live_urls))
    return live_urls, titles


def diff_subdomains(target_id: int, valid_subdomains: set[str]):
    logger.info("compare to existing record: target_id=%s", target_id)
    existing_subdomains: set[str] = get_subdomains(target_id=target_id)
    new: set = valid_subdomains - existing_subdomains
    alive: set = valid_subdomains & existing_subdomains
    missing: set = existing_subdomains - valid_subdomains
    logger.info(
        "diff completed: new=%s still_alive=%s missing=%s",
        len(new),
        len(alive),
        len(missing),
    )
    return new, alive, missing


def run_scan(target_id: int) -> bool:
    try:
        logger.info("scan start: target_id=%s", target_id)
        # Get target domain
        domain: str = get_domain(target_id=target_id)
        logger.info("start scanning domain=%s", domain)
        # Finding subdomains
        subdomains: set = run_subfinder(domain=domain)
        # dns filter
        active_subdomains: set = run_dns_filter(subdomains=subdomains)
        # http probe
        valid_subdomains, titles = run_http_probe(
            active_subdomains=active_subdomains)
        # diff
        new, _, missing = diff_subdomains(
            target_id=target_id, valid_subdomains=valid_subdomains)
        handle_new_subdomains(target_id=target_id, subdomains=new, titles=titles)
        handle_missing_subdomains(target_id=target_id, subdomains=missing)
        send_discord_alert(webhook_url=discord_webhook_url, data=new)
        logger.info(
            "scan completed: target_id=%s new=%s missing=%s",
            target_id,
            len(new),
            len(missing),
        )
        return True
    except Exception:
        logger.exception("scan failed: target_id=%s", target_id)
        return False
