#!/bin/sh
set -e

echo "[entrypoint] Waiting for the database & applying migrations..."
# Retry migrate deploy a few times in case Postgres is still starting up.
n=0
until npx prisma migrate deploy; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then
    echo "[entrypoint] Database not reachable after 10 attempts — exiting."
    exit 1
  fi
  echo "[entrypoint] Migration attempt $n failed, retrying in 3s..."
  sleep 3
done

# Optional one-time seeding of the starter admin/teacher/student accounts.
if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] Seeding database (SEED_ON_START=true)..."
  npm run seed || echo "[entrypoint] Seed step failed or data already present — continuing."
fi

echo "[entrypoint] Starting server on port ${PORT:-8000}..."
exec node dist/server.cjs
