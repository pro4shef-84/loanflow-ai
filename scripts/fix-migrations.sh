#!/bin/bash
# Fix migration tracking: register 003 and 004 as applied, then apply 005

set -e

TOKEN="sbp_df858ddfe925fb590f491dcf8b8f74a2c8a6a4a5"
PROJECT="qwhuqahkpdxvbqxnhwig"
API="https://api.supabase.com/v1/projects/${PROJECT}/database/query"

echo "Step 1: Register migrations 003 and 004 as already applied..."
curl -sf -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('003', 'rate_sheets'), ('004', 'file_completion_engine') ON CONFLICT DO NOTHING\"}"

echo ""
echo "Step 2: Apply migration 005 SQL..."

# Read the migration file
SQL=$(cat /Users/Shef/loanflow-ai/supabase/migrations/005_storage_and_fixes.sql)

# Use python to JSON-encode it properly
PAYLOAD=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SQL")

RESULT=$(curl -sf -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "$RESULT"

echo ""
echo "Step 3: Register migration 005..."
curl -sf -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('005', 'storage_and_fixes') ON CONFLICT DO NOTHING\"}"

echo ""
echo "Step 4: Verify migrations..."
curl -sf -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version\"}"

echo ""
echo "Done!"
