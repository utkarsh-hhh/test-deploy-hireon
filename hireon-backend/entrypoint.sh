#!/bin/bash
set -e

# ── Wait for PostgreSQL (skip when using a cloud DB like Neon on Render) ────────
# Set SKIP_DB_WAIT=true in Render environment to skip this loop.
if [ "${SKIP_DB_WAIT}" != "true" ]; then
  echo "==> [entrypoint] Waiting for PostgreSQL to be ready..."
  MAX_RETRIES=30
  COUNT=0
  until python -c "
import asyncio, asyncpg, os, sys

async def check():
    url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
    try:
        conn = await asyncpg.connect(url)
        await conn.close()
    except Exception as e:
        sys.exit(1)

asyncio.run(check())
" 2>/dev/null; do
    COUNT=$((COUNT + 1))
    if [ \"$COUNT\" -ge \"$MAX_RETRIES\" ]; then
      echo "==> [entrypoint] ERROR: PostgreSQL not available after $MAX_RETRIES attempts. Exiting."
      exit 1
    fi
    echo "==> [entrypoint] Postgres not ready yet (attempt $COUNT/$MAX_RETRIES). Retrying in 2s..."
    sleep 2
  done
  echo "==> [entrypoint] PostgreSQL is ready."
else
  echo "==> [entrypoint] SKIP_DB_WAIT=true — skipping DB wait (cloud DB assumed)."
fi

# ── Alembic migrations ────────────────────────────────────────────────────────
echo "==> [entrypoint] Running Alembic migrations..."
if [ -d "alembic" ] || [ -d "/app/alembic" ]; then
    alembic upgrade head
    echo "==> [entrypoint] Migrations complete."
else
    echo "==> [entrypoint] No alembic directory found, skipping migrations."
fi

# ── Seed database (skip on subsequent deploys if SKIP_SEED=true) ─────────────
if [ "${SKIP_SEED}" != "true" ]; then
  echo "==> [entrypoint] Seeding database..."
  python seed.py
  echo "==> [entrypoint] Seeding complete."
else
  echo "==> [entrypoint] SKIP_SEED=true — skipping seed."
fi

# ── Start Uvicorn ──────────────────────────────────────────────────────────────
echo "==> [entrypoint] Starting Uvicorn..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers 1 \
    --loop uvloop \
    --http httptools
