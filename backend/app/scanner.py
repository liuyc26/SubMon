from time import sleep


def run_scan(target_id: int) -> bool:
    print(f"[+] Scan target {target_id}.")
    print("[+] Get target domain.")
    print("[+] Finding subdomains...")
    print("[+] Filtering alive hosts...")
    print("[+] Identifying net new findings...")
    print("[+] Notify users.")
    print("[+] Store the result to DB.")
    sleep(2)
    return True