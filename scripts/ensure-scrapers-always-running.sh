#!/bin/bash
# Ensure scrapers run 24/7: continuous mode + PM2 auto-restart + boot on startup.
# Run on the VPS (after SSH): bash scripts/ensure-scrapers-always-running.sh

set -e

echo "=== Ensure scrapers always running ==="

if [ ! -f "backend/.env" ]; then
  echo "Error: backend/.env not found. Create it with at least:"
  echo "  ENABLE_CONTINUOUS_SCRAPING=true"
  echo "  ENABLE_CRON_JOBS=true"
  echo "  CONTINUOUS_SCRAPE_INTERVAL_HOURS=0"
  exit 1
fi

# Check .env has continuous scraping
if grep -q "ENABLE_CONTINUOUS_SCRAPING=false" backend/.env 2>/dev/null; then
  echo "WARNING: ENABLE_CONTINUOUS_SCRAPING=false in .env - change to true for always-on scraping"
elif ! grep -q "ENABLE_CONTINUOUS_SCRAPING=true" backend/.env 2>/dev/null; then
  echo ""
  echo "Adding ENABLE_CONTINUOUS_SCRAPING=true to backend/.env"
  echo "" >> backend/.env
  echo "# Always-on scraping (loop until all sources scraped, then repeat)" >> backend/.env
  echo "ENABLE_CONTINUOUS_SCRAPING=true" >> backend/.env
  echo "CONTINUOUS_SCRAPE_INTERVAL_HOURS=0" >> backend/.env
fi

if ! grep -qE "ENABLE_CRON_JOBS=(true|1)" backend/.env 2>/dev/null; then
  if grep -q "ENABLE_CRON_JOBS" backend/.env; then
    echo "WARNING: ENABLE_CRON_JOBS is false - change to true in backend/.env"
  else
    echo "Adding ENABLE_CRON_JOBS=true"
    echo "ENABLE_CRON_JOBS=true" >> backend/.env
  fi
fi

echo ""
echo "[1/3] Restarting PM2 process..."
cd backend
pm2 delete carindex-scraper 2>/dev/null || true
pm2 start ecosystem.config.cjs
echo ""

echo "[2/3] Saving process list (survives pm2 restart)..."
pm2 save
echo ""

echo "[3/3] Enable startup on boot..."
echo "Run the command that pm2 startup outputs below (sudo ...):"
pm2 startup
echo ""

echo "=== Done ==="
echo "Scrapers will:"
echo "  - Run in a continuous loop (all sources, then repeat)"
echo "  - Auto-restart on crash (max 9999 restarts)"
echo "  - Start on VPS reboot (after you run the pm2 startup command above)"
echo ""
echo "Use: pm2 logs carindex-scraper | pm2 status"
