import aiohttp
import asyncio
import json
from typing import Optional, Dict
from .utils import get_logger

logger = get_logger(__name__)

class Provider:
    def __init__(self, config: Dict, target: str, cc: str = '91',
                 proxy: Optional[str] = None, timeout: int = 15):
        self.config = config
        self.target = target
        self.cc = cc
        self.proxy = proxy
        self.timeout = timeout
        self.name = config.get('name', 'Unknown')
        self.method = config.get('method', 'GET')
        self.url = config['url']
        self.headers = self._build_headers()
        self.data = self._build_data()
        self.success = False

    def _build_headers(self) -> Dict:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        if 'headers' in self.config:
            headers.update(self.config['headers'])
        return headers

    def _build_data(self) -> Optional[Dict]:
        if self.method != 'POST':
            return None
        data = self.config.get('data', {}).copy()
        if 'cc_target' in self.config:
            data[self.config['cc_target']] = self.cc
        data[self.config['target_param']] += self.target
        return data

    async def send(self, session: aiohttp.ClientSession) -> bool:
        try:
            if self.method == 'GET':
                url = self.url + self.target
                if 'cc_target' in self.config:
                    url += f"&{self.config['cc_target']}={self.cc}"
                async with session.get(url, headers=self.headers,
                                       proxy=self.proxy, timeout=self.timeout) as resp:
                    text = await resp.text()
            else:  # POST
                json_data = self.data if self.config.get('data_type', '').lower() == 'json' else None
                form_data = None if json_data else self.data
                async with session.post(self.url, json=json_data, data=form_data,
                                        headers=self.headers, proxy=self.proxy,
                                        timeout=self.timeout) as resp:
                    text = await resp.text()
            # Check identifier
            identifier = self.config.get('identifier', '')
            if identifier in text:
                self.success = True
                logger.debug(f"{self.name}: success")
                return True
            else:
                logger.debug(f"{self.name}: failed (identifier not found)")
                return False
        except Exception as e:
            logger.warning(f"{self.name}: error - {str(e)}")
            return False
