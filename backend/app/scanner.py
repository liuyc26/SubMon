import subprocess

from fastapi import HTTPException
from sqlalchemy import update
from sqlmodel import Session, select, col

from app.models import Target, Subdomain
from app.database import engine
from app.alert import send_discord_alert
from app.config import discord_webhook_url


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


def handle_new_subdomains(target_id: int, subdomains: set[str]) -> None:
    print("[+] Insert new subdomains into the database.")
    if not subdomains:
        return
    with Session(engine) as session:
        session.add_all(
            [Subdomain(url=url, title="", status="alive", target_id=target_id)
             for url in subdomains]
        )
        session.commit()


def handle_missing_subdomains(target_id: int, subdomains: set[str]) -> None:
    print("[+] Update missing subdomains in the database.")
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
    print("[+] Run subfinder...")
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
    print(f"-> Found {len(result)} subdomains.")
    return result


def run_dns_filter(subdomains: set[str]) -> set[str]:
    print("[+] Run dnsx...")
    proc = subprocess.run(
        ["dnsx", "-silent"],
        input="\n".join(subdomains),
        text=True,
        capture_output=True,
        timeout=60,
    )
    result = set(proc.stdout.splitlines())
    print(f"-> Found {len(result)} alive hosts.")
    return result


def run_http_probe(active_subdomains: set[str]) -> set[str]:
    print("[+] Run httpx...")
    proc = subprocess.run(
        ["httpx", "-silent"],
        input="\n".join(active_subdomains),
        text=True,
        capture_output=True,
        # timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)
    result = set(proc.stdout.splitlines())
    print(f"-> Found {len(result)} live websites.")
    return result


def diff_subdomains(target_id: int, valid_subdomains: set[str]):
    print("[+] Compare to existing record...")
    existing_subdomains: set[str] = get_subdomains(target_id=target_id)
    new: set = valid_subdomains - existing_subdomains
    alive: set = valid_subdomains & existing_subdomains
    missing: set = existing_subdomains - valid_subdomains
    print(
        f"-> New: {len(new)}, Still alive: {len(alive)}, Missing: {len(missing)}")
    return new, alive, missing


def run_scan(target_id: int) -> bool:
    try:
        # Get target domain
        domain: str = get_domain(target_id=target_id)
        print(f"[+] Start scanning {domain}...")
        # Finding subdomains
        subdomains: set = run_subfinder(domain=domain)
        # dns filter
        active_subdomains: set = run_dns_filter(subdomains=subdomains)
        # http probe
        valid_subdomains: set = run_http_probe(
            active_subdomains=active_subdomains)
        # diff
        new, _, missing = diff_subdomains(
            target_id=target_id, valid_subdomains=valid_subdomains)
        handle_new_subdomains(target_id=target_id, subdomains=new)
        handle_missing_subdomains(target_id=target_id, subdomains=missing)
        send_discord_alert(webhook_url=discord_webhook_url, data=new)
        return True
    except:
        print("Something went wrong")
        return False
