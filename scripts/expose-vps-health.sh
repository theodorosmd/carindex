#!/bin/bash
# Optionally expose port 3000 for /health monitoring from outside.
# WARNING: This opens the full API. Use only if you need external health checks.
# Usage: EXPOSE_VPS_HEALTH=1 bash scripts/expose-vps-health.sh

if [ "${EXPOSE_VPS_HEALTH}" != "1" ]; then
  echo "Set EXPOSE_VPS_HEALTH=1 to run this script"
  exit 1
fi

if [ "$(uname)" != "Linux" ]; then
  echo "Run this on the VPS (Linux)"
  exit 1
fi

echo "Opening port 3000 for health checks (UFW)..."
sudo ufw allow 3000/tcp comment "Carindex /health" 2>/dev/null || true
sudo ufw status | grep 3000 || echo "Check: sudo ufw status"

echo ""
echo "Health should now be reachable at: http://YOUR_VPS_IP:3000/health"
echo "Test: curl http://YOUR_VPS_IP:3000/health"
echo ""
echo "To close: sudo ufw delete allow 3000/tcp"
echo ""
