from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.settings import get_settings
from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_settings_cache():
    """get_settings() is @lru_cache'd; without this, a test that
    monkeypatches an env var and calls get_settings.cache_clear() (to pick
    up the change) leaves a stale cached Settings object for every test
    that runs afterward, regardless of what monkeypatch restores. Clearing
    before and after each test keeps tests isolated no matter the order
    pytest collects them in."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
