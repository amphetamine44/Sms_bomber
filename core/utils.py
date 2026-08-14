import json
import os
import logging
from typing import List, Dict

CACHE_FILE = "config/working_cache.json"
LOG_LEVEL = logging.INFO

def get_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        ch = logging.StreamHandler()
        ch.setLevel(LOG_LEVEL)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        logger.setLevel(LOG_LEVEL)
    return logger

def load_working_providers() -> List[Dict]:
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    return []

def save_working_cache(providers: List[Dict]):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, 'w') as f:
        json.dump(providers, f, indent=2)

def load_provider_pool(filepath="config/providers.json") -> List[Dict]:
    with open(filepath, 'r') as f:
        data = json.load(f)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "providers" in data:
            return data["providers"]
        else:
            raise ValueError("Invalid providers format")
