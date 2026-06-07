#!/usr/bin/env bash
# Apply migration + RLS to remote Supabase project
# Usage: ./supabase/apply.sh <db_password>
set -euo pipefail

REF="xgdaijedjdcswmyebatr"
POOLER_HOST="aws-0-eu-west-1.pooler.supabase.com"
SESSION_PORT="5432"
TRANSACTION_PORT="6543"
DB_USER="postgres.${REF}"
DB_NAME="postgres"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <db_password>"
  exit 1
fi

PW="$1"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install: sudo apt install postgresql-client"
  exit 1
fi

echo "== Step 1/3: Applying Drizzle migration (port $SESSION_PORT, session mode) =="
PGPASSWORD="$PW" psql \
  -h "$POOLER_HOST" -p "$SESSION_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f drizzle/0000_glorious_maverick.sql

echo ""
echo "== Step 2/3: Applying RLS policies =="
PGPASSWORD="$PW" psql \
  -h "$POOLER_HOST" -p "$SESSION_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f supabase/rls.sql

echo ""
echo "== Step 3/3: Verifying schema =="
PGPASSWORD="$PW" psql \
  -h "$POOLER_HOST" -p "$SESSION_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema='public';"
PGPASSWORD="$PW" psql \
  -h "$POOLER_HOST" -p "$SESSION_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "\dt"

echo ""
echo "Done. Migration + RLS applied successfully."
