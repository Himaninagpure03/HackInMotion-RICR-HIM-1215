# --- Build stage: compile/install dependencies in isolation -----------------
FROM python:3.14-slim AS builder

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r /tmp/requirements.txt

# --- Runtime stage -----------------------------------------------------------
FROM python:3.14-slim

RUN groupadd --system app && useradd --system --gid app --create-home app

WORKDIR /app

COPY --from=builder /install /usr/local
COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app

USER app

EXPOSE 8000
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    WEB_CONCURRENCY=2

# Apply pending migrations before serving so every container start is against
# the current schema. exec keeps uvicorn as PID 1 for correct signal handling.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers \"$WEB_CONCURRENCY\" --proxy-headers --forwarded-allow-ips='*' --no-access-log"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/readyz', timeout=3)" || exit 1
