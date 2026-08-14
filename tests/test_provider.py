import pytest
import aiohttp
from unittest.mock import AsyncMock, patch
from core.provider import Provider

@pytest.mark.asyncio
async def test_provider_get_success():
    config = {
        "name": "Test",
        "url": "http://test.com/send?phone=",
        "method": "GET",
        "target_param": "phone",
        "identifier": "OK"
    }
    provider = Provider(config, "1234567890", "1")
    mock_resp = AsyncMock()
    mock_resp.text = AsyncMock(return_value="OK")
    mock_session = AsyncMock()
    mock_session.get.return_value.__aenter__.return_value = mock_resp
    result = await provider.send(mock_session)
    assert result is True
    assert provider.success is True
