# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Системные зависимости для psycopg, lxml, curl (healthcheck Render).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Зависимости отдельным слоем — кэш переиспользуется при правке кода.
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY app ./app

# Render проксирует трафик через переменную PORT; fallback 8000 для локалки.
ENV PORT=8000
EXPOSE 8000

# Healthcheck идёт на наш /health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

# sh -c нужен, чтобы развернуть $PORT в строку аргументов uvicorn.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
