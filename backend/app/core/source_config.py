"""
Резолвер конфигурации источников данных.

Сейчас всегда возвращает глобальные настройки из env, независимо от
user_id. Это осознанный архитектурный шов: когда в Фазе 2 появятся
тенанты со своими ключами/квотами, меняется только эта функция —
bayut.py, list_am.py и orchestrator.py уже прокидывают user_id и не
потребуют повторных правок.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.settings import get_settings


@dataclass(frozen=True)
class SourceConfig:
    rapidapi_key: str | None
    bayut_rapidapi_host: str
    list_am_requests_per_minute: int


def get_source_config(user_id: str | None = None) -> SourceConfig:
    """Возвращает конфиг источников для данного пользователя.

    user_id зарезервирован под будущую мультитенантность (Фаза 2) —
    сегодня не используется, всегда возвращаются глобальные настройки.
    """
    settings = get_settings()
    return SourceConfig(
        rapidapi_key=settings.rapidapi_key,
        bayut_rapidapi_host=settings.bayut_rapidapi_host,
        list_am_requests_per_minute=2,
    )
