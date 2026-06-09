"""
Refiner Agent.

Принимает свободный текст + (опционально) контекст пользователя.
Возвращает RefinedQuery со всеми полями + список open_questions для тех
параметров, которые не удалось безопасно определить.

LLM-путь:
  Claude вызывается с forced tool_use, чтобы гарантировать строгую JSON-схему.

Fallback (без ключа Claude):
  Лёгкая эвристика на регулярках. Определяет страну, бюджет, число комнат.
  Возвращает много open_questions — пользователь увидит уточнения в UI.
"""

from __future__ import annotations

import logging
import re

from app.models.schemas import CountryCode, RefinedQuery, UserContext
from app.services import claude_client

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You are a real-estate query refiner. Convert the user's free-form request "
    "into a strict structured brief by calling `emit_refined_query`. "
    "Supported countries: AE (UAE), AM (Armenia), GE (Georgia). "
    "If the user did not explicitly specify a parameter and the user context "
    "does not strongly suggest one, leave it null and add a short question to "
    "`open_questions` instead of guessing. "
    "Budget currency should match the country norm (AE→AED or USD, AM→USD or AMD, GE→USD). "
    "Always set `target_count` to 100 unless the user said otherwise."
)


TOOL_SCHEMA = {
    "type": "object",
    "properties": {
        "country": {"type": "string", "enum": ["AE", "AM", "GE"]},
        "city": {"type": ["string", "null"]},
        "districts": {"type": "array", "items": {"type": "string"}},
        "deal": {"type": "string", "enum": ["buy", "rent"]},
        "property_kind": {
            "type": "string",
            "enum": ["apartment", "house", "villa", "studio", "commercial", "land", "any"],
        },
        "budget_min": {"type": ["integer", "null"], "minimum": 0},
        "budget_max": {"type": ["integer", "null"], "minimum": 0},
        "currency": {"type": "string"},
        "rooms_min": {"type": ["integer", "null"], "minimum": 0},
        "rooms_max": {"type": ["integer", "null"], "minimum": 0},
        "area_min_m2": {"type": ["integer", "null"], "minimum": 0},
        "area_max_m2": {"type": ["integer", "null"], "minimum": 0},
        "target_count": {"type": "integer", "minimum": 1, "default": 100},
        "open_questions": {"type": "array", "items": {"type": "string"}},
        "intent_summary": {"type": ["string", "null"]},
    },
    "required": ["country", "deal", "property_kind", "currency", "target_count", "open_questions"],
}


def refine_query(text: str, user_context: UserContext | None = None) -> RefinedQuery:
    """Главная точка входа."""
    if claude_client.is_enabled():
        llm_result = _refine_with_llm(text, user_context)
        if llm_result:
            return llm_result

    return _refine_with_heuristics(text)


def _refine_with_llm(text: str, user_context: UserContext | None) -> RefinedQuery | None:
    context_section = ""
    if user_context:
        context_section = (
            f"\n\nUser context (use as hints, do not override explicit user statements):\n"
            f"{user_context.model_dump_json(indent=2)}"
        )

    user_prompt = f"User request:\n{text.strip()}{context_section}"

    payload = claude_client.call_with_tool(
        system=SYSTEM_PROMPT,
        user=user_prompt,
        tool_name="emit_refined_query",
        tool_description="Emit validated structured property brief.",
        tool_schema=TOOL_SCHEMA,
        max_tokens=1024,
    )
    if not payload:
        return None
    try:
        return RefinedQuery.model_validate(payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Refiner: LLM payload failed validation: %s", exc)
        return None


# ============================================================
#  Heuristic fallback — без LLM
# ============================================================

_COUNTRY_KEYWORDS: dict[CountryCode, tuple[str, ...]] = {
    "AE": ("дубай", "dubai", "оаэ", "uae", "абу-даби", "abu dhabi", "шарджа", "sharjah", "эмираты"),
    "AM": ("ереван", "yerevan", "армения", "armenia", "list.am", "list am"),
    "GE": ("тбилиси", "tbilisi", "батуми", "batumi", "грузия", "georgia", "myhome", "ss.ge"),
}


def _detect_country(text: str) -> CountryCode | None:
    lower = text.lower()
    for code, words in _COUNTRY_KEYWORDS.items():
        if any(w in lower for w in words):
            return code
    return None


def _detect_budget(text: str) -> tuple[int | None, str | None]:
    """Возвращает (budget_max, currency)."""
    m = re.search(r"([\d\s.,]{3,})\s?(\$|usd|aed|amd|gel|eur|€|₽|rub|m|million|млн|k|тыс)?", text, re.IGNORECASE)
    if not m:
        return None, None
    raw = m.group(1).replace(" ", "").replace(",", "").replace(".", "")
    unit = (m.group(2) or "").lower()
    try:
        value = int(raw)
    except ValueError:
        return None, None
    if unit in {"m", "million", "млн"}:
        value *= 1_000_000
    elif unit in {"k", "тыс"}:
        value *= 1_000
    elif value < 1000:
        return None, None  # явно не цена
    currency_map = {
        "$": "USD", "usd": "USD",
        "aed": "AED",
        "amd": "AMD",
        "gel": "GEL",
        "eur": "EUR", "€": "EUR",
        "₽": "RUB", "rub": "RUB",
    }
    currency = currency_map.get(unit)
    return value, currency


def _detect_rooms(text: str) -> int | None:
    m = re.search(r"(\d+)\s?(комн|комнат|bed|beds|br|room|rooms|к\.?$|комнат\w*)", text, re.IGNORECASE)
    return int(m.group(1)) if m else None


def _refine_with_heuristics(text: str) -> RefinedQuery:
    country = _detect_country(text)
    budget_max, currency = _detect_budget(text)
    rooms = _detect_rooms(text)

    open_questions: list[str] = []
    if country is None:
        open_questions.append("В какой стране ищем? (ОАЭ / Армения / Грузия)")
        country = "AE"  # дефолт чтобы тип сошёлся
    if budget_max is None:
        open_questions.append("Какой максимальный бюджет?")
    if currency is None:
        currency = {"AE": "AED", "AM": "USD", "GE": "USD"}[country]
    if rooms is None:
        open_questions.append("Сколько минимум комнат?")

    return RefinedQuery(
        country=country,
        deal="buy",
        property_kind="apartment",
        budget_max=budget_max,
        currency=currency,
        rooms_min=rooms,
        target_count=100,
        open_questions=open_questions,
        intent_summary=text.strip()[:200] if text else None,
    )
