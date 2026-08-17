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
