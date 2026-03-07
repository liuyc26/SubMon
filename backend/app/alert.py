import logging

import requests

logger = logging.getLogger(__name__)


def send_discord_alert(webhook_url: str, data: set[str]) -> None:
    if data:
        logger.info("send discord alert: new_subdomains=%s", len(data))
        message: str = f"Found {len(data)} new subdomains"
        message += "\n" + "\n".join(list(data)[:10])
        payload: dict = {"content": message}
        response = requests.post(webhook_url, json=payload)
        if response.status_code not in (200, 204):
            raise RuntimeError(f"Discord error {response.status_code}: {response.text}")
