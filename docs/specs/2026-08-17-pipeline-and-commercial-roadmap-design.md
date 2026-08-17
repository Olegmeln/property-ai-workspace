# Pipeline Hardening & Path to a Commercial Product — Design

**Date:** 2026-08-17
**Status:** Approved in chat, pending final review before planning
**Repo:** property-ai-workspace

## Goal

Take the existing AI-agent property search pipeline (React/Tauri frontend + FastAPI backend, agents: refine → strategize → orchestrator.execute → normalize) from its current MVP state to a product usable for personal use first, with the underlying architecture built so it can grow into a commercial product without a rewrite.

## Current State (as of this design)

- Frontend: React + TS + Vite, deployable both as a Tauri desktop app and as a web app (Vercel config present). Drag-and-drop agent canvas (React Flow), results in AG Grid + Mapbox.
- Backend: FastAPI (Render-deployed), stateless — no auth, no persisted data. `DATABASE_URL` is defined in settings but nothing currently reads/writes through it.
- Agents pipeline: `refine → strategize → orchestrator.execute → normalize`. New endpoints (`/refine`, `/strategize`, `/search`) coexist with legacy endpoints (`/query`, `/search-legacy` returning mock data, `/normalize`) kept for backward compatibility with an already-deployed frontend build.
- Data sources: `bayut.py` (UAE, via a paid/unofficial RapidAPI wrapper — sustainable model) and `list_am.py` (Armenia, direct HTML scraping via httpx + selectolax). The `list_am.py` module contains an explicit warning: list.am disallows aggressive scraping per robots.txt, and the code comment states usage should stay at "1-2 searches/minute" with a browser-like User-Agent — currently a convention in a comment, not an enforced limit.
- No source exists yet for Russia. `orchestrator.py` has a stub entry for `myhome-ge-browser` (Georgia, "next PR") showing the established pattern for adding a new source: implement a `search(params, target_count)` function returning `list[RawListing]`, register the channel string in `orchestrator._run_source`.
- Global settings (`Settings` in `core/settings.py`) hold API keys and config as process-wide environment variables — there is currently no concept of "whose credentials/quota is this."

## Business Model Decision

Discussed three options for what "commercial" means here: (1) sell the AI-pipeline tool itself, with each tenant operating under their own data-source quota/credentials, (2) license/white-label the tool to real estate agencies who already have legitimate portal access, (3) invest upfront in licensed/partner data feeds.

**Decision: Option 1 — sell the tool, not aggregated data.** Rationale: the target markets (Armenia via list.am, Russia via a portal TBD-by-source) either explicitly restrict scraping (list.am's robots.txt) or are known to aggressively rate-limit/ban scrapers and rarely offer public resale-friendly APIs (Cian, Avito, Yandex Nedvizhimost). Aggregating and reselling that data under one shared platform account concentrates legal and operational risk on the platform operator and scales badly — more paying users means more shared-account traffic against sites that are already hostile to bulk automated access. Selling the AI workflow, with usage scoped and rate-limited per tenant (optionally against the tenant's own credentials/subscription where a source requires one), keeps each tenant's usage within the same "personal, economical" envelope the current code already assumes for list.am, and keeps liability distributed rather than concentrated.

This decision does not require solving the full data-source legal question today — it constrains the *architecture* (tenant-scoped credentials and rate limits from the start) without blocking Phase 0/1 work, which doesn't need real tenants yet.

## Architecture Direction

The one architectural seam that must exist from Phase 0 onward, even before real accounts exist, is **tenant-scoped credentials and rate limits**:

- Wrap all source credential/config lookups (`RAPIDAPI_KEY`, per-source rate limits, future BYO-keys) behind a single resolver, e.g. `get_source_config(user_id: str | None) -> SourceConfig`, that today simply returns the existing global `Settings` values regardless of `user_id`. When real tenants exist (Phase 2), only this resolver changes — call sites in `bayut.py`, `list_am.py`, the new Russia source, and the orchestrator don't need to change again.
- Formalize the list.am rate limit (currently a code comment) as an actual enforced limit using Redis (already in the stack via `services/celery_app.py` infra), keyed by `user_id` once tenants exist, keyed by a single global key until then. This directly reduces ban/legal risk today, not just later.
- Introduce real persistence via the already-declared `DATABASE_URL`: a listings cache (raw + normalized, keyed by source + external_id, with a fetched-at timestamp) and search history. This both improves the product (faster repeat searches, history) and reduces scraping volume (cache hits avoid re-scraping within a freshness window), which also serves the rate-limit/legal goal.

## Phased Roadmap

### Phase 0 — Pipeline hardening (no accounts yet)

- Wire `DATABASE_URL` to a real Postgres schema: `listings` (cache) and `search_history` tables.
- Make the new `/search` (real orchestrator path) the frontend's default; `/search-legacy` (mock data) becomes an explicit fallback path only, used if `/search` fails, not the default flow.
- Implement the Redis-backed rate limiter for `list_am.py` (single global key for now), replacing the comment-only convention.
- Introduce the `get_source_config(user_id)` resolver and route existing source modules through it, even though every call passes `user_id=None` today.

### Phase 1 — Personal-grade product

- Add the Yandex Nedvizhimost source, following the `orchestrator.py` channel pattern (`search(params, target_count) -> list[RawListing]`, registered as a new channel, e.g. `yandex-realty-browser`).
  - **Open technical risk, flagged explicitly rather than guessed at:** unlike list.am (plain server-rendered HTML, scraped via httpx + selectolax), Yandex Nedvizhimost is expected to be a JS-driven SPA backed by internal API/GraphQL-style endpoints. Confirming whether those internal endpoints can be called directly (httpx) or whether headless rendering is required is the first task under this item in the implementation plan — treat it as a short investigation, not an assumption baked into the design.
- Result Normalizer improvements: cross-source dedup quality, currency normalization consistency, field completeness for the AG Grid table.
- Listing cache gets an incremental refresh policy (reuse cached results within a freshness window instead of a full re-scrape every run).
- Basic single-user auth in front of the backend — protects the instance once it's reachable beyond localhost (Vercel/Render), and is the natural first slice of the Phase 2 tenant model.

### Phase 2 — Commercial readiness

- Real multi-tenant accounts (users table, session/JWT auth), replacing the Phase 1 single-user login.
- Per-tenant BYO-credentials UI (e.g., a tenant's own RapidAPI key) and per-tenant quota/usage tracking, both routed through the `get_source_config(user_id)` seam introduced in Phase 0.
- Per-tenant rate limiting in the Redis limiter (already keyed by `user_id` since Phase 0's formalization, just enforced per-key instead of globally).
- Billing/subscription (e.g. Stripe) gating tenant creation and quota tiers.
- Terms of Service / disclaimer language making each tenant responsible for their own use of upstream data sources, consistent with the "sell the tool, not the data" decision.
- Optional: white-label/B2B packaging (the previously-considered Option 2) as an upsell built on the same per-tenant seam — not required for the core roadmap, noted here so a future decision doesn't require re-deriving the connection.

## Testing / Verification

- Phase 0: DB writes/reads covered by tests against a test Postgres instance (or sqlite-compatible test double if the schema allows); rate limiter tested for both under-limit and over-limit behavior; `/search` vs `/search-legacy` fallback path covered by a test that simulates orchestrator failure.
- Phase 1: new source module tested the same way `list_am.py`/`bayut.py` would be — fixture HTML/JSON responses, no live network calls in tests. Normalizer dedup/currency logic gets unit tests with intentionally overlapping/conflicting fixture data.
- Phase 2: tenant isolation is the critical property to test — one tenant's quota/rate-limit/credentials must not leak into another tenant's requests.

## Explicit Non-Goals (this document)

- Exact billing provider integration details (Stripe plans, webhooks) — deferred to Phase 2 planning once Phase 0/1 ship.
- Exact UI design for account/credentials management — deferred to its own bounded design pass when Phase 1's basic auth lands.
- Choosing a scraping vs. headless-rendering approach for Yandex Nedvizhimost — explicitly called out above as a Phase 1 investigation task, not decided here.

## Self-Review

- **Placeholder scan:** no TBD/TODO left unresolved except the explicitly-flagged Yandex Nedvizhimost rendering approach, which is intentionally deferred to an investigation task rather than guessed.
- **Internal consistency:** the `get_source_config(user_id)` seam introduced in Phase 0 is the same one extended in Phase 2 — no contradicting mechanisms introduced later.
- **Scope check:** three phases, each independently shippable; Phase 0 requires no product decisions beyond what's already been agreed above.
- **Ambiguity check:** the business-model choice (sell tool, not data) is stated as a constraint on architecture, not as a claim that the legal question is fully resolved — Phase 2's ToS/disclaimer item exists precisely because this is a risk-reduction decision, not a risk-elimination one.
