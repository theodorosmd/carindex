# Déploiement du scraping sur VPS

Ce guide permet de déployer le worker de scraping Carindex sur un VPS dédié, pour que le scraping tourne 24/7 en continu. L'API reste sur Railway ; seul le scraping s'exécute sur le VPS.

## Architecture

- **Railway** : API uniquement (CORS, auth, routes). Les crons sont désactivés.
- **VPS** : Backend Node avec `ENABLE_CONTINUOUS_SCRAPING=true`, tourne en boucle.
- **Supabase** : Base commune pour les deux. Le worker écrit dans `raw_listings` et `scraper_runs`.

---

## 1. Configuration Railway (obligatoire)

Pour éviter de faire tourner les scrapers en double, configurez sur Railway :

| Variable | Valeur |
|----------|--------|
| `ENABLE_CRON_JOBS` | `false` |

Sans ça, Railway et le VPS exécuteraient tous deux le scraping.

---

## 2. Prérequis VPS

- **OS** : Ubuntu 22.04 LTS ou 24.04 (recommandé)
- **Ressources** : 2 CPU, 4 Go RAM minimum (Puppeteer peut utiliser ~500 Mo)
- **Sortie** : Connexion internet pour Supabase, scrape.do et les sites cibles

### Recommandations par type de serveur

| Serveur | vCPU | RAM | SCRAPE_CONCURRENCY | Prix (ex.) |
|---------|------|-----|--------------------|------------|
| Hetzner CX23 / CCX13 | 2 | 4–8 GB | 2–3 | ~€4–12/mo |
| **Hetzner CCX23** (recommandé) | **4 dédiés** | **16 GB** | **6–8** | **~€24/mo** |
| Hetzner CCX33 | 8 dédiés | 32 GB | 10–12 | ~€48/mo |

### Dépendances système (Puppeteer)

```bash
sudo apt update
sudo apt install -y chromium-browser fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 xdg-utils
```

### Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 3. Déploiement avec PM2

### Option A : Script d’installation automatique

En une commande (clone + setup) :

```bash
cd /opt && git clone https://github.com/theodorosmd/carindex.git && cd carindex && bash scripts/setup-vps.sh
```

Le script installe Node 20, les dépendances Puppeteer et `npm install` dans `backend/`. À la fin, créez `backend/.env` puis lancez PM2 (voir ci-dessous).

### Option B : Installation manuelle

```bash
cd /opt  # ou ~/carindex selon votre préférence
git clone https://github.com/theodorosmd/carindex.git
cd carindex/backend
npm install
```

### Configuration `.env`

Créez `backend/.env` avec au minimum :

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SCRAPE_DO_TOKEN=xxx
ENABLE_CONTINUOUS_SCRAPING=true
ENABLE_CRON_JOBS=true
CONTINUOUS_SCRAPE_INTERVAL_HOURS=0
# 6–8 pour CCX23 (4 vCPU, 16 GB) ; 2–3 pour serveurs plus petits
SCRAPE_CONCURRENCY=6
```

Optionnel (pour que le VPS ne fasse que le scraping) :

```env
ENABLE_DAILY_SCRAPING=false
ENABLE_AUTO_SCRAPERS=false
ENABLE_IMAGE_BACKFILL=false
ENABLE_ARBITRAGE_DETECTION=false
ENABLE_DJANGO_IMPORT=false
ENABLE_RAW_LISTINGS_PROCESSOR=true
ENABLE_SALES_DETECTION=true
```

### Lancement avec PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # exécutez la commande sudo affichée pour démarrage au boot
```

**Pour que les scrapers tournent 24/7** (recommandé sur VPS) :

```bash
cd /opt/carindex
bash scripts/ensure-scrapers-always-running.sh
# Puis exécutez la commande sudo affichée par pm2 startup
```

Vérifiez que `backend/.env` contient : `ENABLE_CONTINUOUS_SCRAPING=true`, `ENABLE_CRON_JOBS=true`, `CONTINUOUS_SCRAPE_INTERVAL_HOURS=0`.

### Commandes utiles

```bash
pm2 logs carindex-scraper    # voir les logs en direct
pm2 monit                    # tableau de bord
pm2 restart carindex-scraper # redémarrer
pm2 stop carindex-scraper    # arrêter
```

---

## 4. Déploiement avec Docker

### Build et run

```bash
cd carindex/backend
docker build -t carindex-scraper .
docker run -d --name carindex-scraper --restart unless-stopped \
  -e SUPABASE_URL=https://xxx.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=xxx \
  -e SCRAPE_DO_TOKEN=xxx \
  -e ENABLE_CONTINUOUS_SCRAPING=true \
  -e ENABLE_CRON_JOBS=true \
  carindex-scraper
```

Ou avec un fichier `.env` :

```bash
docker run -d --name carindex-scraper --restart unless-stopped \
  --env-file .env \
  carindex-scraper
```

---

## 5. Mode de scraping

| Variable | Valeur | Effet |
|----------|--------|-------|
| `ENABLE_CONTINUOUS_SCRAPING` | `true` | Exécute tous les scrapers en boucle jusqu'à épuisement, puis recommence |
| `CONTINUOUS_SCRAPE_INTERVAL_HOURS` | `0` | Aucune pause entre deux cycles |
| `CONTINUOUS_SCRAPE_INTERVAL_HOURS` | `2` | Pause de 2 h entre chaque cycle (limite la charge) |
| `SCRAPE_CONCURRENCY` | `3` | Scrapers en parallèle (défaut) ; **6–8** pour CCX23 |

---

## 6. Mises à jour

```bash
cd /opt/carindex
git pull
cd backend
npm install
pm2 restart carindex-scraper
```

---

## 7. Vérifier que le VPS tourne

### Option A : SSH + script de statut (sur le VPS)

```bash
# Connexion SSH
ssh root@VOTRE_IP_VPS

# Depuis le VPS
cd /opt/carindex
bash scripts/check-vps-status.sh
```

Ou en une ligne depuis votre machine locale :

```bash
ssh root@VOTRE_IP_VPS 'cd /opt/carindex && bash scripts/check-vps-status.sh'
```

Le script affiche : PM2 status, réponse de `/health`, dernières lignes de logs.

### Option B : Vérifier l’activité dans Supabase (depuis votre machine)

```bash
cd backend
node src/scripts/check-vps-activity.js
```

Utilise `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` du `.env`. Affiche les runs récents (`scraper_runs`), `raw_listings` récents et l’état des auto-scrapers.

### Option C : Exposer /health pour un moniteur externe

Si vous voulez que le VPS réponde à des health checks externes :

```bash
# Sur le VPS
EXPOSE_VPS_HEALTH=1 bash scripts/expose-vps-health.sh
```

Puis : `curl http://VOTRE_IP_VPS:3000/health`

⚠️ Cela ouvre le port 3000 : l’API complète devient accessible. Utilisez uniquement pour du monitoring contrôlé.

---

## 8. Sécurité et maintenance

- **Pare-feu** : bloquez le port 3000 si vous n'exposez pas l'API sur le VPS. Ou ouvrez-le uniquement pour `/health` si un moniteur externe le consulte.
- **Logs** : `pm2 logs carindex-scraper` ou `pm2 monit`
- **Surveillance** : le monitoring existant (`monitoring/`) peut scraper `/health` du VPS si exposé.
