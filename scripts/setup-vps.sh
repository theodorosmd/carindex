#!/bin/bash
# Script d'installation du worker de scraping Carindex sur VPS (Ubuntu)
# Usage: bash scripts/setup-vps.sh
# À exécuter depuis la racine du projet (carindex/) après git clone

set -e

echo "=== Carindex VPS Setup ==="

# Vérifier qu'on est dans le bon répertoire
if [ ! -d "backend" ] || [ ! -f "backend/package.json" ]; then
  echo "Erreur: exécutez ce script depuis la racine du projet carindex/ (après git clone)"
  exit 1
fi

# Vérifier qu'on est sur Linux
if [ "$(uname)" != "Linux" ]; then
  echo "Ce script est conçu pour Linux (Ubuntu/Debian)"
  exit 1
fi

echo ""
echo "[1/4] Mise à jour des paquets..."
sudo apt-get update -qq

echo ""
echo "[2/4] Installation des dépendances Puppeteer (Chromium)..."
if grep -q "24.04" /etc/os-release 2>/dev/null; then
  sudo apt-get install -y chromium-browser fonts-liberation libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 \
    libcups2t64 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0t64 libgtk-3-0t64 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 xdg-utils
else
  sudo apt-get install -y chromium-browser fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 xdg-utils
fi

echo ""
echo "[3/4] Installation de Node.js 20..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node $(node -v), npm $(npm -v)"

echo ""
echo "[4/5] Installation des dépendances backend..."
cd backend
npm install
cd ..

echo ""
echo "[5/5] Installation de PM2..."
sudo npm install -g pm2

echo ""
if [ -f "backend/.env" ]; then
  echo "=== Fichier .env détecté : lancement du scraper ==="
  cd backend
  pm2 delete carindex-scraper 2>/dev/null || true
  pm2 start ecosystem.config.cjs
  pm2 save
  cd ..
  echo ""
  echo "Scraper lancé. Pour démarrage au boot, exécutez la commande affichée par:"
  echo "  pm2 startup"
  echo ""
  echo "Commandes utiles: pm2 logs carindex-scraper | pm2 restart carindex-scraper"
else
  echo "=== Installation terminée ==="
  echo ""
  echo "Créez backend/.env avec au minimum:"
  echo "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SCRAPE_DO_TOKEN=..."
  echo "  ENABLE_CONTINUOUS_SCRAPING=true ENABLE_CRON_JOBS=true"
  echo "  SCRAPE_CONCURRENCY=6 CONTINUOUS_SCRAPE_INTERVAL_HOURS=0"
  echo ""
  echo "Puis lancez: cd backend && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
fi
echo ""
echo "Sur Railway: définissez ENABLE_CRON_JOBS=false"
echo ""
echo "Pour vérifier le statut du VPS : bash scripts/check-vps-status.sh"
echo "Pour exposer /health (monitoring) : EXPOSE_VPS_HEALTH=1 bash scripts/expose-vps-health.sh"
echo ""
