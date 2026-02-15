import requests

def send_discord_alert(webhook_url: str, data: set[str]) -> None:
    print("[+] Send alert to the user.")

    message: str = f"Found {len(data)} new subdomains"
    if data:
        message += "\n" + "\n".join(data)

    payload: dict = {"content": message}

    response = requests.post(webhook_url, json=payload)

    if response.status_code not in (200, 204):
        raise RuntimeError(f"Discord error {response.status_code}: {response.text}")
