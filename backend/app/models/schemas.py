"""
Доменные схемы.

Архитектурный принцип: каждая стадия пайплайна имеет свой контракт,
не один общий «листинг». Это даёт возможность параллельно гонять разные
источники и потом схлопывать.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ============================================================
#  Уточнённый запрос (выход Refiner Agent)
# ============================================================

CountryCode = Literal["AE", "AM", "GE"]
DealKind = Literal["buy", "rent"]
PropertyKind = Literal["apartment", "house", "villa", "studio", "commercial", "land", "any"]


class RefinedQuery(BaseModel):
    """Структурированный бриф после уточнения."""

    country: CountryCode
    city: str | None = None
    districts: list[str] = Field(default_factory=list)

    deal: DealKind = "buy"
    property_kind: PropertyKind = "apartment"

    budget_min: int | None = None
    budget_max: int | None = None
    currency: str = "USD"

    rooms_min: int | None = None
    rooms_max: int | None = None
    area_min_m2: int | None = None
    area_max_m2: int | None = None

    # Целевое количество результатов.
    target_count: int = 100

    # Открытые вопросы к пользователю — то, что агент не смог сам решить.
    open_questions: list[str] = Field(default_factory=list)

    # Свободный «дух» запроса — на будущее для семантического матчинга.
    intent_summary: str | None = None


# ============================================================
#  План поиска (выход Strategist Agent)
# ============================================================

SourceChannel = Literal["bayut-rest", "propertyfinder-rest", "list-am-browser", "myhome-ge-browser"]


class SourcePlan(BaseModel):
    """Один канал-источник + параметры под него."""

    channel: SourceChannel
    weight: float = 1.0   # вес результатов этого источника при слиянии
    params: dict = Field(default_factory=dict)


class SearchStrategy(BaseModel):
    """План: один или несколько источников, желательно параллельно."""

    sources: list[SourcePlan]
    rationale: str | None = None  # объяснение выбора для UI


# ============================================================
#  Листинги
# ============================================================


class RawListing(BaseModel):
    """Сырой листинг от источника. Нормализован минимально — только то,
    что одинаково у всех источников."""

    source: SourceChannel
    external_id: str
    title: str
    url: str | None = None

    country: CountryCode
    city: str | None = None
    district: str | None = None
    lat: float | None = None
    lng: float | None = None

    price: float
    currency: str

    area_m2: float | None = None
    rooms: float | None = None
    property_kind: str | None = None

    photo_url: str | None = None
    raw: dict = Field(default_factory=dict)  # оригинальный объект источника


class RankedListing(RawListing):
    """Листинг после ранжирования."""

    score: float = 0.0
    reasoning: str | None = None


# ============================================================
#  Контекст пользователя (на будущее, для Context Agent)
# ============================================================


class UserContext(BaseModel):
    user_id: str = "anonymous"
    preferred_countries: list[CountryCode] = Field(default_factory=list)
    preferred_districts: dict[str, list[str]] = Field(default_factory=dict)  # {country: [...]}
    typical_budget_max: dict[str, int] = Field(default_factory=dict)  # {currency: amount}
    likes: list[str] = Field(default_factory=list)        # external_id'ы понравившихся
    dislikes: list[str] = Field(default_factory=list)
    notes: str | None = None  # свободное саммари от Context Agent


# ============================================================
#  Контракты API
# ============================================================


class RefineRequest(BaseModel):
    text: str
    user_context: UserContext | None = None


class StrategizeRequest(BaseModel):
    query: RefinedQuery


class SearchRequest(BaseModel):
    query: RefinedQuery
    strategy: SearchStrategy | None = None
    user_context: UserContext | None = None


# ============================================================
#  Backwards-compatible схемы для старых эндпоинтов
#  /query, /search, /normalize — нужны фронту, который сейчас на проде
# ============================================================


class StructuredQuery(BaseModel):
    city: str = "Dubai"
    budget_max: int = Field(default=850_000, ge=0)
    rooms_min: int = Field(default=2, ge=0)
    districts: list[str] = Field(default_factory=list)


class Listing(BaseModel):
    id: str
    title: str
    price: float
    area: float
    rooms: float
    district: str
    lat: float
    lng: float
    score: float
    reasoning: str | None = None


class QueryRequest(BaseModel):
    text: str
    params: dict = Field(default_factory=dict)


class LegacySearchRequest(BaseModel):
    query: StructuredQuery
    params: dict = Field(default_factory=dict)


class NormalizeRequest(BaseModel):
    listings: list[Listing]
    params: dict = Field(default_factory=dict)
    query: StructuredQuery | None = None
