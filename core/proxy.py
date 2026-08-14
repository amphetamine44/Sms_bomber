import aiohttp
import random
from typing import Optional, List

class ProxyManager:
    def __init__(self, sources: Optional[List[str]] = None):
        self.proxies = []
        self.sources = sources or [
            "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all",
            "https://gimmeproxy.com/api/getProxy?curl=true&protocol=http&supportsHttps=true"
        ]
        self._fetch_proxies()

    def _fetch_proxies(self):
        # Synchronous fetch for simplicity; in production use aiohttp
        # For demo, we populate with a known free proxy (may be dead)
        # Real implementation would use asyncio to gather proxies.
        # We'll provide a fallback list.
        self.proxies = [
            "http://123.123.123.123:8080",
            "http://45.33.24.224:8080",
        ]
        # Attempt to fetch from sources (simplified)
        try:
            import requests
            for src in self.sources:
                resp = requests.get(src, timeout=5)
                if resp.status_code == 200:
                    # Parse based on source format – here we just add raw lines
                    lines = resp.text.strip().split('\n')
                    for line in lines:
                        if ':' in line:
                            self.proxies.append(f"http://{line.strip()}")
                    break
        except Exception:
            pass
        if not self.proxies:
            self.proxies = [None]  # direct connection

    def get_proxy(self) -> Optional[str]:
        return random.choice(self.proxies)
