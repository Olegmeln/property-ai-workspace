# Phase 0: Pipeline Hardening Implementation Plan

> **For whoever executes this:** use the `executing-plans` skill to work through it task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the real (non-mock) search pipeline so it actually runs end to end, and lay the tenant-scoped credentials/rate-limit/persistence seams the commercial roadmap depends on — without introducing accounts yet.

**Architecture:** Frontend gains typed adapters between its existing UI-facing types and the backend's real `/refine`/`/search` contracts, replacing the currently-broken `/search` call that silently falls back to mock data on every request. Backend gains a `get_source_config(user_id)` resolver (stubbed to global settings today), a Redis-backed rate limiter for list.am, and a minimal Postgres persistence layer (listings cache + search history) via raw SQL + psycopg — no ORM, matching the project's current dependency-light style.

**Tech Stack:** React + TypeScript + Vite (frontend), FastAPI + Pydantic v2 + psycopg3 + redis-py (backend), pytest (new backend test infra), vitest (new frontend test infra).

**Spec:** `docs/specs/2026-08-17-pipeline-and-commercial-roadmap-design.md` — this plan implements only that spec's Phase 0 section.

## Global Constraints

- Backend route handlers stay synchronous `def` (not `async def`), matching every existing handler in `backend/app/routes/agents.py`.
- No ORM/migration framework is introduced — the codebase currently has none (only `psycopg[binary]` in requirements), and adding one is a bigger decision than Phase 0 hardening.
- Code comments/docstrings in backend Python files follow the existing convention of Russian-language docstrings (see `list_am.py`, `bayut.py`, `orchestrator.py`).
- `/search-legacy` and its mock (`fallbackSearch` in the frontend) are not deleted — they remain the resilience fallback, per the spec.
- Every new backend module must work with `RAPIDAPI_KEY`/`DATABASE_URL` unset (local dev without full infra) without crashing at import time — matching `bayut.py`'s existing "if key not set, return empty" pattern.

---

### Task 1: Backend test infrastructure

**Files:**
- Create: `backend/requirements-dev.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`

**Interfaces:**
- Produces: a `client` pytest fixture (FastAPI `TestClient` wired to `app.main.app`) that every later backend test task in this plan reuses.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_health.py`:
```python
def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pip install -r requirements.txt -r requirements-dev.txt && pytest tests/test_health.py -v`
Expected: FAIL — collection error, `conftest.py` doesn't exist yet so there's no `client` fixture.

- [ ] **Step 3: Write minimal implementation**

`backend/requirements-dev.txt`:
```
pytest>=8.0.0
fakeredis>=2.20.0
```

`backend/tests/__init__.py`:
```python
```
(empty file — marks `tests` as a package so relative imports work)

`backend/tests/conftest.py`:
```python
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/requirements-dev.txt backend/tests/__init__.py backend/tests/conftest.py backend/tests/test_health.py
git commit -m "test: add pytest infra with a health-check smoke test"
```

---

### Task 2: Frontend adapters between UI types and the real backend contract

**Files:**
- Create: `src/api/adapters.ts`
- Create: `src/api/adapters.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest`, `test` script)

**Interfaces:**
- Consumes: `StructuredQuery`, `Listing` from `../types` (unchanged); `RefinedQuery`-shaped and `RawListing`-shaped response objects matching `backend/app/models/schemas.py` (mirrored here as local TS types, since the frontend has no generated client).
- Produces:
  - `toRefinedQuery(query: StructuredQuery): RefinedQuery` — builds a valid backend request body.
  - `fromRawListings(listings: RawListing[]): Listing[]` — maps the real backend response into the shape the AG Grid table and Mapbox view already render.

- [ ] **Step 1: Write the failing test**

`src/api/adapters.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { fromRawListings, toRefinedQuery } from "./adapters";

describe("toRefinedQuery", () => {
  it("maps a StructuredQuery into a valid RefinedQuery with sane defaults", () => {
    const result = toRefinedQuery({
      city: "Yerevan",
      budget_max: 150000,
      rooms_min: 2,
      districts: ["Center"]
    });

    expect(result.country).toBe("AM");
    expect(result.city).toBe("Yerevan");
    expect(result.districts).toEqual(["Center"]);
    expect(result.budget_max).toBe(150000);
    expect(result.rooms_min).toBe(2);
    expect(result.deal).toBe("buy");
    expect(result.property_kind).toBe("apartment");
    expect(result.target_count).toBe(100);
  });
});

describe("fromRawListings", () => {
  it("maps backend RawListing objects into the UI Listing shape", () => {
    const result = fromRawListings([
      {
        source: "list-am-browser",
        external_id: "12345",
        title: "2-room apartment",
        url: "https://www.list.am/item/12345",
        country: "AM",
        city: "Yerevan",
        district: "Center",
        lat: null,
        lng: null,
        price: 95000,
        currency: "USD",
        area_m2: 62,
        rooms: 2,
        property_kind: "apartment",
        photo_url: null,
        raw: {}
      }
    ]);

    expect(result).toEqual([
      {
        id: "list-am-browser:12345",
        title: "2-room apartment",
        price: 95000,
        area: 62,
        rooms: 2,
        district: "Center",
        lat: 0,
        lng: 0,
        score: 0
      }
    ]);
  });

  it("falls back to safe defaults when optional fields are missing", () => {
    const result = fromRawListings([
      {
        source: "bayut-rest",
        external_id: "77",
        title: "",
        url: null,
        country: "AE",
        city: null,
        district: null,
        lat: null,
        lng: null,
        price: 500000,
        currency: "AED",
        area_m2: null,
        rooms: null,
        property_kind: null,
        photo_url: null,
        raw: {}
      }
    ]);

    expect(result[0].title).toBe("Без названия");
    expect(result[0].district).toBe("—");
    expect(result[0].area).toBe(0);
    expect(result[0].rooms).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm install --save-dev vitest && npm run test`
Expected: FAIL — `src/api/adapters.ts` doesn't exist yet, and there's no `test` script.

- [ ] **Step 3: Write minimal implementation**

`vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node"
  }
});
```

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

`src/api/adapters.ts`:
```typescript
import type { Listing, StructuredQuery } from "../types";

// Мёрит модели backend/app/models/schemas.py — фронт не генерирует клиент,
// поэтому формы держим синхронизированными вручную.

export type CountryCode = "AE" | "AM" | "GE";
export type DealKind = "buy" | "rent";
export type PropertyKind = "apartment" | "house" | "villa" | "studio" | "commercial" | "land" | "any";

export interface RefinedQuery {
  country: CountryCode;
  city: string | null;
  districts: string[];
  deal: DealKind;
  property_kind: PropertyKind;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  rooms_min: number | null;
  rooms_max: number | null;
  area_min_m2: number | null;
  area_max_m2: number | null;
  target_count: number;
  open_questions: string[];
  intent_summary: string | null;
}

export type SourceChannel = "bayut-rest" | "propertyfinder-rest" | "list-am-browser" | "myhome-ge-browser";

export interface RawListing {
  source: SourceChannel;
  external_id: string;
  title: string;
  url: string | null;
  country: CountryCode;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  price: number;
  currency: string;
  area_m2: number | null;
  rooms: number | null;
  property_kind: string | null;
  photo_url: string | null;
  raw: Record<string, unknown>;
}

// Пока districts[0] определяет страну через простую эвристику: город из
// формы у нас сейчас без явного поля страны (см. StructuredQuery). Армения
// — основной рынок MVP, поэтому дефолт "AM". Когда в UI появится явный
// выбор страны/рынка, этот адаптер станет тоньше, а не сложнее.
export function toRefinedQuery(query: StructuredQuery): RefinedQuery {
  return {
    country: "AM",
    city: query.city || null,
    districts: query.districts,
    deal: "buy",
    property_kind: "apartment",
    budget_min: null,
    budget_max: query.budget_max,
    currency: "USD",
    rooms_min: query.rooms_min,
    rooms_max: null,
    area_min_m2: null,
    area_max_m2: null,
    target_count: 100,
    open_questions: [],
    intent_summary: null
  };
}

export function fromRawListings(listings: RawListing[]): Listing[] {
  return listings.map((listing) => ({
    id: `${listing.source}:${listing.external_id}`,
    title: listing.title || "Без названия",
    price: listing.price,
    area: listing.area_m2 ?? 0,
    rooms: listing.rooms ?? 0,
    district: listing.district || "—",
    lat: listing.lat ?? 0,
    lng: listing.lng ?? 0,
    // RawListing не несёт score/reasoning — ранжирующего агента пока нет
    // в пайплайне (это отдельная будущая задача, не Фаза 0). 0 — честный
    // дефолт, а не заглушка «доделать потом».
    score: 0
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/api/adapters.ts src/api/adapters.test.ts vitest.config.ts package.json package-lock.json
git commit -m "test: add vitest infra and RefinedQuery/RawListing adapters"
```

---

### Task 3: Wire the frontend to the real `/search` contract

**Files:**
- Modify: `src/api/client.ts:26-31` (the `searchListings` function)
- Modify: `src/store/workspace.ts:174-177` (the `listing-search` branch of `runPipeline`)

**Interfaces:**
- Consumes: `toRefinedQuery`, `fromRawListings`, `RawListing` from `./adapters` (Task 2).
- Produces: `searchListings(query: StructuredQuery, params): Promise<Listing[]>` — same public signature as before, so `workspace.ts`'s call site and the existing `fallbackSearch` fallback need no shape changes, only the real branch changes.

- [ ] **Step 1: Write the failing test**

`src/api/client.test.ts`:
```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchListings } from "./client";

describe("searchListings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a RefinedQuery to /search and maps the RawListing response back to Listing[]", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        strategy: { sources: [], rationale: null },
        listings: [
          {
            source: "list-am-browser",
            external_id: "1",
            title: "Test",
            url: null,
            country: "AM",
            city: "Yerevan",
            district: "Center",
            lat: null,
            lng: null,
            price: 100000,
            currency: "USD",
            area_m2: 50,
            rooms: 2,
            property_kind: "apartment",
            photo_url: null,
            raw: {}
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchListings(
      { city: "Yerevan", budget_max: 150000, rooms_min: 2, districts: ["Center"] },
      {}
    );

    expect(result).toEqual([
      {
        id: "list-am-browser:1",
        title: "Test",
        price: 100000,
        area: 50,
        rooms: 2,
        district: "Center",
        lat: 0,
        lng: 0,
        score: 0
      }
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/search");
    const body = JSON.parse(init.body as string);
    expect(body.query.country).toBe("AM");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- client.test.ts`
Expected: FAIL — `searchListings` still sends the old `StructuredQuery` body shape, so `body.query.country` is `undefined`, not `"AM"`.

- [ ] **Step 3: Write minimal implementation**

In `src/api/client.ts`, replace the `searchListings` function (lines 26-31):
```typescript
import { fromRawListings, toRefinedQuery, type RawListing } from "./adapters";

// ... (keep existing imports and postJson helper above)

export async function searchListings(query: StructuredQuery, _params: Record<string, unknown>) {
  const response = await postJson<
    { query: ReturnType<typeof toRefinedQuery> },
    { strategy: unknown; listings: RawListing[] }
  >("/search", { query: toRefinedQuery(query) });

  return fromRawListings(response.listings);
}
```

In `src/store/workspace.ts`, the `listing-search` branch (lines 174-177) needs no change — it already calls `searchListings(payload as StructuredQuery, node.data.params)` inside `runWithFallback`, and `searchListings`'s public signature (`(query, params) => Promise<Listing[]>`) is unchanged. Confirm this by re-reading lines 173-178 after Task 3 Step 3 and leaving them untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (all frontend tests, including Task 2's and Task 3's)

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts src/api/client.test.ts
git commit -m "fix: point searchListings at the real /search contract instead of the mismatched legacy shape"
```

---

### Task 4: Backend `get_source_config` resolver

**Files:**
- Create: `backend/app/core/source_config.py`
- Create: `backend/tests/test_source_config.py`
- Modify: `backend/app/agents/sources/bayut.py:31` (`search` signature)
- Modify: `backend/app/agents/sources/list_am.py:44` (`search` signature)
- Modify: `backend/app/agents/orchestrator.py:44-51` (`_run_source`, thread `user_id` through)

**Interfaces:**
- Produces: `get_source_config(user_id: str | None = None) -> SourceConfig`, a `SourceConfig` dataclass with `rapidapi_key: str | None`, `bayut_rapidapi_host: str`, `list_am_requests_per_minute: int`. Every call today passes `user_id=None` and gets the global `Settings` values back — this is the seam Phase 2 tenant credentials will plug into later without touching `bayut.py`/`list_am.py`/`orchestrator.py` again.
- Consumes: `get_settings()` from `app.core.settings` (existing).

- [ ] **Step 1: Write the failing test**

`backend/tests/test_source_config.py`:
```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_source_config.py -v`
Expected: FAIL with "No module named 'app.core.source_config'"

- [ ] **Step 3: Write minimal implementation**

`backend/app/core/source_config.py`:
```python
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
```

Update `backend/app/agents/sources/bayut.py`, the `search` function signature (line 31):
```python
def search(
    params: dict[str, Any], target_count: int = 100, user_id: str | None = None
) -> list[RawListing]:
    """Главная точка входа агента."""
    config = get_source_config(user_id)
    if not config.rapidapi_key:
        logger.info("RAPIDAPI_KEY not set; bayut-rest agent skipped.")
        return []

    host = config.bayut_rapidapi_host
    # ... остальная функция без изменений, просто использует host/config.rapidapi_key
    # вместо settings.bayut_rapidapi_host / settings.rapidapi_key
```
Add `from app.core.source_config import get_source_config` to the imports at the top of `bayut.py`, and remove the now-unused `from app.core.settings import get_settings` import if nothing else in the file uses it directly.

Update `backend/app/agents/sources/list_am.py`, the `search` function signature (line 44):
```python
def search(
    params: dict[str, Any], target_count: int = 100, user_id: str | None = None
) -> list[RawListing]:
    """Главная точка входа агента."""
    config = get_source_config(user_id)
    # config.list_am_requests_per_minute используется в Задаче 5 (рейт-лимитер)
    ...
```
Add `from app.core.source_config import get_source_config` to `list_am.py`'s imports.

Update `backend/app/agents/orchestrator.py`, `execute` and `_run_source` (lines 20-51) to accept and thread `user_id`:
```python
def execute(strategy: SearchStrategy, target_count: int = 100, user_id: str | None = None) -> list[RawListing]:
    all_listings: list[RawListing] = []
    seen: set[tuple[str, str]] = set()

    for source_plan in strategy.sources:
        per_source_target = max(20, target_count // max(1, len(strategy.sources)) + 20)
        try:
            results = _run_source(source_plan.channel, source_plan.params, per_source_target, user_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Source %s failed: %s", source_plan.channel, exc)
            results = []

        for listing in results:
            key = (listing.source, listing.external_id)
            if key in seen:
                continue
            seen.add(key)
            all_listings.append(listing)

    return all_listings[:target_count]


def _run_source(channel: str, params: dict, target: int, user_id: str | None = None) -> list[RawListing]:
    if channel == "bayut-rest":
        return bayut.search(params, target_count=target, user_id=user_id)
    if channel == "list-am-browser":
        return list_am.search(params, target_count=target, user_id=user_id)
    # myhome-ge-browser — заглушка под следующий PR
    if channel == "myhome-ge-browser":
        logger.info("myhome-ge-browser not yet implemented")
        return []
    logger.warning("Unknown channel: %s", channel)
    return []
```

`backend/app/routes/agents.py`'s `/search` handler (line 58-61) calls `orchestrator.execute(strategy, target_count=request.query.target_count)` — no change needed since `user_id` defaults to `None`, matching "every call passes user_id=None today" from the Interfaces block above.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_source_config.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/source_config.py backend/tests/test_source_config.py backend/app/agents/sources/bayut.py backend/app/agents/sources/list_am.py backend/app/agents/orchestrator.py
git commit -m "feat: introduce get_source_config(user_id) seam ahead of Phase 2 tenancy"
```

---

### Task 5: Redis-backed rate limiter for list.am

**Files:**
- Create: `backend/app/services/rate_limiter.py`
- Create: `backend/tests/test_rate_limiter.py`
- Modify: `backend/app/agents/sources/list_am.py:44-71` (the request loop inside `search`)
- Modify: `backend/requirements.txt` (no new runtime dependency — `redis` is already listed)

**Interfaces:**
- Produces: `check_and_consume(redis_client, key: str, max_per_window: int, window_seconds: int) -> bool` — returns `True` if the call is allowed (and records it), `False` if the window's quota is already used up.
- Consumes: any object implementing the `redis.Redis` interface (a real client in production, `fakeredis.FakeRedis()` in tests) — passed in explicitly rather than constructed inside the function, so tests don't need a live Redis.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_rate_limiter.py`:
```python
import fakeredis

from app.services.rate_limiter import check_and_consume


def test_allows_calls_up_to_the_limit():
    redis_client = fakeredis.FakeRedis()

    assert check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60) is True
    assert check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60) is True


def test_blocks_calls_beyond_the_limit():
    redis_client = fakeredis.FakeRedis()

    check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60)
    check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60)

    assert check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60) is False


def test_different_keys_have_independent_limits():
    redis_client = fakeredis.FakeRedis()

    check_and_consume(redis_client, "list-am:tenant-a", max_per_window=1, window_seconds=60)

    assert check_and_consume(redis_client, "list-am:tenant-b", max_per_window=1, window_seconds=60) is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_rate_limiter.py -v`
Expected: FAIL with "No module named 'app.services.rate_limiter'"

- [ ] **Step 3: Write minimal implementation**

`backend/app/services/rate_limiter.py`:
```python
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
```

Update `backend/app/agents/sources/list_am.py`: add imports and a module-level Redis client, then guard the request loop.
```python
import redis

from app.core.settings import get_settings
from app.services.rate_limiter import check_and_consume

_redis_client = redis.Redis.from_url(get_settings().redis_url)
```
Inside `search`, right before the `while len(listings) < target_count and page <= 10:` loop's body issues its `client.get(...)` call, add:
```python
            allowed = check_and_consume(
                _redis_client,
                key=f"list-am:{user_id or 'global'}",
                max_per_window=config.list_am_requests_per_minute,
                window_seconds=60,
            )
            if not allowed:
                logger.warning("list.am rate limit hit for %s; stopping early", user_id or "global")
                break
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_rate_limiter.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/rate_limiter.py backend/tests/test_rate_limiter.py backend/app/agents/sources/list_am.py
git commit -m "feat: enforce list.am rate limit via Redis instead of a comment-only convention"
```

---

### Task 6: Postgres schema and connection helper

**Files:**
- Create: `backend/app/db/schema.sql`
- Create: `backend/app/db/connection.py`
- Create: `backend/tests/test_db_connection.py`

**Interfaces:**
- Produces: `get_connection() -> psycopg.Connection` (reads `DATABASE_URL` from settings, raises a clear `RuntimeError` if unset) and `init_schema(conn) -> None` (idempotently applies `schema.sql`).
- These are the only two functions Task 7 needs to build the actual cache/history read-write logic on top of.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_db_connection.py`:
```python
import os

import pytest

from app.db.connection import get_connection, init_schema

requires_database = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL not set; start backend/docker-compose.yml postgres service to run this test",
)


@requires_database
def test_init_schema_creates_expected_tables():
    conn = get_connection()
    init_schema(conn)

    with conn.cursor() as cur:
        cur.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        )
        tables = {row[0] for row in cur.fetchall()}

    assert "listings_cache" in tables
    assert "search_history" in tables
    conn.close()


def test_get_connection_raises_clear_error_when_database_url_unset(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    from app.core.settings import get_settings
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        get_connection()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_db_connection.py -v`
Expected: FAIL with "No module named 'app.db.connection'"

- [ ] **Step 3: Write minimal implementation**

`backend/app/db/schema.sql`:
```sql
-- Кэш листингов: по (source, external_id), с временем последнего фетча —
-- используется, чтобы не пере-скрейпить один и тот же листинг в течение
-- окна свежести (снижает нагрузку на источники и риск бана).
CREATE TABLE IF NOT EXISTS listings_cache (
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (source, external_id)
);

-- История поисков — для Фазы 1 (история в UI) и как побочный эффект,
-- полезный сигнал для будущего лимитирования по тенанту.
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    query JSONB NOT NULL,
    result_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`backend/app/db/connection.py`:
```python
"""
Тонкий слой поверх psycopg3 — без ORM (см. Global Constraints плана).
"""

from __future__ import annotations

from pathlib import Path

import psycopg

from app.core.settings import get_settings

_SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_connection() -> psycopg.Connection:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not set; cannot open a database connection.")
    return psycopg.connect(settings.database_url)


def init_schema(conn: psycopg.Connection) -> None:
    sql = _SCHEMA_PATH.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_db_connection.py -v` (the `test_get_connection_raises_clear_error_when_database_url_unset` test runs anywhere; `test_init_schema_creates_expected_tables` requires `docker compose up -d postgres` from `backend/` first, with `DATABASE_URL=postgresql://property_ai:property_ai@localhost:5432/property_ai_workspace` set)
Expected: PASS (the DB-dependent test PASSes when Postgres is up, SKIPs cleanly otherwise)

- [ ] **Step 5: Commit**

```bash
git add backend/app/db/schema.sql backend/app/db/connection.py backend/tests/test_db_connection.py
git commit -m "feat: add Postgres schema and connection helper for listings cache and search history"
```

---

### Task 7: Wire the listings cache and search history into the real `/search` route

**Files:**
- Create: `backend/app/services/listings_store.py`
- Create: `backend/tests/test_listings_store.py`
- Modify: `backend/app/routes/agents.py:58-61` (the `/search` handler)

**Interfaces:**
- Consumes: `get_connection` from `app.db.connection` (Task 6).
- Produces: `get_cached(conn, source: str, external_id: str, max_age_seconds: int) -> dict | None` and `upsert_listings(conn, listings: list[RawListing]) -> None` and `record_search(conn, user_id: str | None, query: dict, result_count: int) -> None`.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_listings_store.py`:
```python
import os

import pytest

from app.db.connection import get_connection, init_schema
from app.services.listings_store import get_cached, record_search, upsert_listings

requires_database = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL not set; start backend/docker-compose.yml postgres service to run this test",
)


@pytest.fixture()
def conn():
    connection = get_connection()
    init_schema(connection)
    with connection.cursor() as cur:
        cur.execute("TRUNCATE listings_cache, search_history")
    connection.commit()
    yield connection
    connection.close()


@requires_database
def test_upsert_then_get_cached_round_trips(conn):
    upsert_listings(conn, [{"source": "list-am-browser", "external_id": "1", "title": "Test"}])

    cached = get_cached(conn, "list-am-browser", "1", max_age_seconds=3600)

    assert cached is not None
    assert cached["title"] == "Test"


@requires_database
def test_get_cached_returns_none_when_missing(conn):
    assert get_cached(conn, "list-am-browser", "does-not-exist", max_age_seconds=3600) is None


@requires_database
def test_record_search_inserts_a_row(conn):
    record_search(conn, user_id=None, query={"city": "Yerevan"}, result_count=5)

    with conn.cursor() as cur:
        cur.execute("SELECT result_count FROM search_history")
        row = cur.fetchone()

    assert row[0] == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_listings_store.py -v`
Expected: FAIL with "No module named 'app.services.listings_store'"

- [ ] **Step 3: Write minimal implementation**

`backend/app/services/listings_store.py`:
```python
"""
Чтение/запись кэша листингов и истории поисков. Тонкая обёртка над
psycopg3 — без ORM, консистентно с app/db/connection.py.
"""

from __future__ import annotations

import json
from typing import Any

import psycopg


def get_cached(
    conn: psycopg.Connection, source: str, external_id: str, max_age_seconds: int
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT payload FROM listings_cache
            WHERE source = %s AND external_id = %s
              AND fetched_at > now() - make_interval(secs => %s)
            """,
            (source, external_id, max_age_seconds),
        )
        row = cur.fetchone()

    return row[0] if row else None


def upsert_listings(conn: psycopg.Connection, listings: list[dict[str, Any]]) -> None:
    with conn.cursor() as cur:
        for listing in listings:
            cur.execute(
                """
                INSERT INTO listings_cache (source, external_id, payload, fetched_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (source, external_id)
                DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now()
                """,
                (listing["source"], listing["external_id"], json.dumps(listing)),
            )
    conn.commit()


def record_search(conn: psycopg.Connection, user_id: str | None, query: dict[str, Any], result_count: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO search_history (user_id, query, result_count) VALUES (%s, %s, %s)",
            (user_id, json.dumps(query), result_count),
        )
    conn.commit()
```

Update `backend/app/routes/agents.py`'s `/search` handler (lines 58-61) to record history, tolerating a missing/unreachable database (Phase 0 must keep working with `DATABASE_URL` unset, per Global Constraints):
```python
@router.post("/search")
def search(request: SearchRequest):
    strategy = request.strategy or strategize(request.query)
    listings = orchestrator.execute(strategy, target_count=request.query.target_count)

    try:
        from app.db.connection import get_connection
        from app.services.listings_store import record_search, upsert_listings

        conn = get_connection()
        upsert_listings(conn, [listing.model_dump(mode="json") for listing in listings])
        record_search(conn, user_id=None, query=request.query.model_dump(), result_count=len(listings))
        conn.close()
    except RuntimeError:
        pass  # DATABASE_URL not configured — fine for local dev / Phase 0 without persistence.

    return {"strategy": strategy, "listings": listings}
```

Note on scope: this writes every search's results into `listings_cache` (write-through), which is what Phase 1's incremental-refresh item builds on. It does **not** yet make `_run_source` check `get_cached` before hitting a live source — list.am/Bayut are queried by search parameters, not by a known list of external IDs, so "skip scraping if cached" needs a per-query freshness check, not a per-listing one. That's a Phase 1 design question (how stale is "stale" for a given query), not a Phase 0 bug — `get_cached` is implemented and tested here so Phase 1 can use it once that question is answered, but it's intentionally unused by this route today.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_listings_store.py -v` (requires `docker compose up -d postgres` from `backend/`, `DATABASE_URL` set, same as Task 6)
Expected: PASS

- [ ] **Step 6: Full backend suite**

Run: `cd backend && pytest -v`
Expected: all tests PASS or SKIP cleanly (DB tests skip without `DATABASE_URL`)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/listings_store.py backend/tests/test_listings_store.py backend/app/routes/agents.py
git commit -m "feat: record search history from the real /search route, tolerating no database configured"
```

---

## Self-Review

- **Spec coverage:** all four Phase 0 bullets from the spec map to a task — DB persistence (Tasks 6-7), `/search` becomes the real default path (Tasks 2-3, which also surfaced and fixed a live bug: the frontend's old `/search` body never matched the new `SearchRequest` schema, so every "real" search was silently hitting the mock fallback), formalized list.am rate limit (Task 5), `get_source_config(user_id)` seam (Task 4).
- **Placeholder scan:** no TBD/TODO/"handle later" language; the one deliberately deferred piece (read-through cache avoidance in `_run_source`) is called out explicitly with the architectural reason it doesn't fit Phase 0, not left vague.
- **Type consistency:** `SourceConfig` fields (Task 4) match their use in Task 5's rate limiter call and the updated `bayut.py`/`list_am.py`. `RefinedQuery`/`RawListing` TS types (Task 2) match their use in Task 3's `client.ts` and test fixtures. `get_connection`/`init_schema` (Task 6) match their use in Task 7's fixtures and route wiring.
- **Test strategy consistency:** every task follows the plan's own testing section from the spec — backend uses `pytest`/`TestClient`/`fakeredis`, no live network calls; frontend uses `vitest` with `fetch` stubbed; DB-dependent tests skip cleanly without `DATABASE_URL` rather than failing CI when Postgres isn't running.

## How this plan and the spec get into the repository

Neither file was pushed by the assistant — it doesn't have write access to this GitHub repo. Both live locally and were delivered as downloadable files:
- `docs/specs/2026-08-17-pipeline-and-commercial-roadmap-design.md`
- `docs/plans/2026-08-17-phase-0-pipeline-hardening.md`

See the chat message accompanying this plan for the exact `git` commands to add them to a local clone and push.
