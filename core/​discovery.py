import aiohttp
import asyncio
from typing import List, Dict

class ProviderDiscoverer:
    SOURCES = [
        "https://raw.githubusercontent.com/example/sms-providers/main/providers.json",
        # Add more public repos if known
    ]

    @classmethod
    async def fetch_public(cls) -> List[Dict]:
        providers = []
        async with aiohttp.ClientSession() as session:
            for url in cls.SOURCES:
                try:
                    async with session.get(url, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if isinstance(data, list):
                                providers.extend(data)
                            elif isinstance(data, dict) and "providers" in data:
                                providers.extend(data["providers"])
                except Exception:
                    pass
        return providers
