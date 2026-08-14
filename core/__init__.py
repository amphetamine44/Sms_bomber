"""
SMS Testing Framework – Core Package
Provides the main classes for provider management, bombing orchestration,
proxy rotation, discovery, and utilities.
"""

from .provider import Provider
from .bomber import Bomber
from .proxy import ProxyManager
from .discovery import ProviderDiscoverer
from .utils import (
    get_logger,
    load_working_providers,
    save_working_cache,
    load_provider_pool
)

__all__ = [
    "Provider",
    "Bomber",
    "ProxyManager",
    "ProviderDiscoverer",
    "get_logger",
    "load_working_providers",
    "save_working_cache",
    "load_provider_pool"
]

__version__ = "1.0.0"
