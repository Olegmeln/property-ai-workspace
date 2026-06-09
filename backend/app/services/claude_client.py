"""
Тонкая обёртка над anthropic SDK. Lazy-init: клиент создаётся только если
есть ключ. Любая ошибка ловится и возвращается None — каждый агент сам
решает, что делать в этом случае (обычно fallback на эвристики).
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

from anthropic import Anthropic, APIError

from app.core.settings import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _client() -> Anthropic | None:
    api_key = get_settings().anthropic_api_key
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set; LLM calls will be skipped.")
        return None
    return Anthropic(api_key=api_key)


def is_enabled() -> bool:
    return _client() is not None


def call_with_tool(
    *,
    system: str,
    user: str,
    tool_name: str,
    tool_description: str,
    tool_schema: dict[str, Any],
    max_tokens: int = 1024,
    model: str | None = None,
) -> dict[str, Any] | None:
    """
    Принудительный вызов одного инструмента. Возвращает распарсенный input
    инструмента или None при любой ошибке.
    """
    client = _client()
    if client is None:
        return None

    tool = {"name": tool_name, "description": tool_description, "input_schema": tool_schema}
    try:
        response = client.messages.create(
            model=model or get_settings().anthropic_model,
            max_tokens=max_tokens,
            system=system,
            tools=[tool],
            tool_choice={"type": "tool", "name": tool_name},
            messages=[{"role": "user", "content": user}],
        )
    except APIError as exc:
        logger.warning("Anthropic API error in call_with_tool: %s", exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected Anthropic error: %s", exc)
        return None

    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and getattr(block, "name", None) == tool_name:
            return dict(block.input)

    logger.warning("No matching tool_use block in response for %s", tool_name)
    return None


def call_text(*, system: str, user: str, max_tokens: int = 1024, model: str | None = None) -> str | None:
    client = _client()
    if client is None:
        return None
    try:
        response = client.messages.create(
            model=model or get_settings().anthropic_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
    except APIError as exc:
        logger.warning("Anthropic API error in call_text: %s", exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected Anthropic error: %s", exc)
        return None

    parts = [getattr(b, "text", "") for b in response.content if getattr(b, "type", None) == "text"]
    out = "".join(parts).strip()
    return out or None


def safe_json_loads(value: str) -> Any:
    cleaned = value.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None
