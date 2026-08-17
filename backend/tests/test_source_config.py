from app.core.source_config import get_source_config


def test_returns_global_settings_when_no_user_id(monkeypatch):
    monkeypatch.setenv("RAPIDAPI_KEY", "test-key")
    from app.core.settings import get_settings
    get_settings.cache_clear()

    config = get_source_config(user_id=None)

    assert config.rapidapi_key == "test-key"
    assert config.bayut_rapidapi_host == "bayut.p.rapidapi.com"
    assert config.list_am_requests_per_minute == 2


def test_same_result_regardless_of_user_id_today():
    config_anonymous = get_source_config(user_id=None)
    config_named = get_source_config(user_id="future-tenant-123")

    assert config_anonymous == config_named
