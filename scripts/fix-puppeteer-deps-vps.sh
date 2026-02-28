#!/bin/bash
# Fix Puppeteer/Chromium "libglib-2.0.so.0: cannot open shared object file" on VPS
# Run on VPS: bash scripts/fix-puppeteer-deps-vps.sh

set -e
echo "=== Fix Puppeteer dependencies (libglib) ==="

if [ "$(uname)" != "Linux" ]; then
  echo "Run this on the VPS (Linux)"
  exit 1
fi

echo "Installing libglib2.0 and related Chromium deps..."
if grep -q "24.04" /etc/os-release 2>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y libglib2.0-0t64
else
  sudo apt-get update -qq
  sudo apt-get install -y libglib2.0-0
fi

echo ""
echo "Restarting carindex-scraper..."
cd /opt/carindex/backend 2>/dev/null && pm2 restart carindex-scraper

echo ""
echo "Done. Check: pm2 logs carindex-scraper"
