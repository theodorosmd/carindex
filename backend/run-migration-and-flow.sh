#!/bin/bash
# 1. Copie le SQL dans le presse-papier, ouvre Supabase SQL Editor
# 2. Après exécution manuelle, lance le flux mobile.de

set -e
cd "$(dirname "$0")"

echo "=== Migration 020+021 + Flux mobile.de ==="
echo ""

# Afficher le SQL
SQL=$(cat migration-020-021.sql)

# Copier dans le presse-papier (macOS)
if command -v pbcopy &>/dev/null; then
  echo "$SQL" | pbcopy
  echo "✅ SQL copié dans le presse-papier (Cmd+V pour coller)"
fi

echo ""
echo "1. Ouverture de Supabase SQL Editor..."
open "https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql/new" 2>/dev/null || true
echo "2. Collez le SQL (Cmd+V) et cliquez Run"
echo "3. Une fois terminé, appuyez sur Entrée ici pour lancer le flux mobile.de..."
read -r

echo ""
echo "=== Lancement du flux mobile.de ==="
cd /Users/theodoredignet/Downloads/mobile
source .venv/bin/activate 2>/dev/null || true
INGEST_API_KEY="${INGEST_API_KEY:-carindex-ingest-dev-key}" \
INGEST_API_URL="${INGEST_API_URL:-http://localhost:3001}" \
  ./run_standalone.sh
