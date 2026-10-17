#!/usr/bin/env bash
# Runs the permission tests on a throwaway local Postgres (no Supabase needed).
# Usage: pnpm test:db   (needs PostgreSQL server binaries, e.g. postgresql-16)
set -euo pipefail
cd "$(dirname "$0")/.."

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/initdb" ] || { echo "PostgreSQL server binaries not found (set PGBIN)"; exit 2; }

DIR="$(mktemp -d)"; PORT=54$((RANDOM % 900 + 100))
RUN=""; [ "$(id -u)" = 0 ] && { chown postgres "$DIR"; RUN="su postgres -c"; }
run() { if [ -n "$RUN" ]; then $RUN "$*"; else bash -c "$*"; fi; }
cleanup() { run "$PGBIN/pg_ctl -D $DIR/data stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

run "$PGBIN/initdb -D $DIR/data -A trust" >/dev/null
run "$PGBIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log start" >/dev/null
export PGHOST="$DIR" PGPORT="$PORT" PGUSER=postgres
for _ in $(seq 20); do "$PGBIN/pg_isready" -q && break; sleep 0.5; done
"$PGBIN/psql" -q -c "create database t" postgres

FILES=(-f tests/00_stub_auth.sql)
for f in migrations/*.sql; do FILES+=(-f "$f"); done
FILES+=(-f tests/permissions_test.sql)
"$PGBIN/psql" -q -t -A -d t -v ON_ERROR_STOP=1 "${FILES[@]}" 2>&1 | grep -E 'ok  |FAIL|ERROR|PASSED'
