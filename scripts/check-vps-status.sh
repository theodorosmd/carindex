#!/bin/bash
# VPS status check - run ON the VPS (after SSH) or via: ssh user@VPS_IP 'bash -s' < scripts/check-vps-status.sh
# Usage: bash scripts/check-vps-status.sh
# From local: ssh root@YOUR_VPS_IP 'cd /opt/carindex && bash scripts/check-vps-status.sh'

set -e

echo "=== Carindex VPS Status ==="
echo ""

echo "--- PM2 Process ---"
if command -v pm2 &>/dev/null; then
  pm2 status carindex-scraper 2>/dev/null || pm2 status 2>/dev/null || echo "PM2 not running carindex-scraper"
else
  echo "PM2 not installed"
fi
echo ""

echo "--- Local Health Endpoint ---"
if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
  echo "✓ /health OK"
  curl -s http://localhost:3000/health | head -c 200
  echo ""
else
  echo "✗ /health unreachable (port 3000 may be down or firewalled)"
fi
echo ""

echo "--- Last 5 Log Lines ---"
if command -v pm2 &>/dev/null; then
  pm2 logs carindex-scraper --lines 5 --nostream 2>/dev/null || echo "No logs"
else
  echo "PM2 not available"
fi
echo ""
echo "Done."
