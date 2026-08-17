"""
Простой рейт-лимитер поверх Redis (fixed window).

Формализует то, что раньше было конвенцией в комментарии
(list_am.py: «1-2 поиска в минуту максимум»). Ключ сегодня общий
(«list-am:global»), в Фазе 2 станет per-tenant («list-am:<user_id>»)
без изменения этой функции.
"""

from __future__ import annotations

from typing import Protocol


class RedisLike(Protocol):
    def incr(self, key: str) -> int: ...
    def expire(self, key: str, seconds: int) -> bool: ...
    def ttl(self, key: str) -> int: ...


def check_and_consume(redis_client: RedisLike, key: str, max_per_window: int, window_seconds: int) -> bool:
    """Возвращает True, если вызов разрешён (и засчитывает его), иначе False."""
    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, window_seconds)

    return count <= max_per_window
