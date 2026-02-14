import subprocess

from fastapi import HTTPException
from sqlmodel import Session

from app.models import Target
from app.database import engine

def get_domain(target_id: int) -> str:
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        return target.url


def run_subfinder(domain: str) -> set[str]:
    print("[+] Run subfinder...")
    cmd = ["subfinder", "-silent", "-d", domain]
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)
    result = set(proc.stdout.splitlines())
    print(f"[+] Found {len(result)} subdomains.")
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
    print(f"[+] Found {len(result)} alive hosts.")
    return result


def run_http_probe(active_subdomains: set[str]) -> set[str]:
    print("[+] Run httpx...")
    proc = subprocess.run(
        ["httpx", "-silent"],
        input="\n".join(active_subdomains),
        text=True,
        capture_output=True,
        timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)
    result = set(proc.stdout.splitlines())
    print(f"Found {len(result)} live URLs.")
    return result


def find_net_new():
    pass


def run_scan(target_id: int) -> bool:
    print(f"[+] Scan target {target_id}.")
    # Get target domain
    domain: str = get_domain(target_id=target_id)
    # Finding subdomains
    subdomains: set = run_subfinder(domain=domain)
    # dns filter
    active_subdomains: set = run_dns_filter(subdomains=subdomains)
    # http probe
    result: set = run_http_probe(active_subdomains=active_subdomains)
    print(result)
    print("[+] Identifying net new findings...")
    # diff
    print("[+] Notify users.")
    print("[+] Store the result to DB.")
    return True