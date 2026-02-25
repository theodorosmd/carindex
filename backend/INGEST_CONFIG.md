# Configuration Ingest (API REST Supabase)

## Résumé

Le scraper Python mobile.de envoie les listings vers l'API Carindex au lieu de Django. Les données vont dans `raw_listings` puis `listings` (Supabase).

## Configuration requise

### 1. Backend Carindex (`backend/.env`)

```env
# Supabase (obligatoire)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Clé API pour les scrapers (POST /api/v1/ingest/public/*)
# Génère une clé longue et sécurisée
INGEST_API_KEY=ton-secret-long-min-32-chars
```

### 2. Projet Python mobile (`/Downloads/mobile/.env`)

```env
# URL du backend Carindex (local ou prod)
INGEST_API_URL=http://localhost:3001
# ou INGEST_API_URL=https://ton-api.carindex.com

# Même clé que INGEST_API_KEY du backend
INGEST_API_KEY=ton-secret-long-min-32-chars
```

### 3. Vérifier que les clés correspondent

- La clé dans le backend `.env` (INGEST_API_KEY) est celle que le middleware attend.
- La clé dans le projet mobile `.env` doit être identique.
- Le scraper envoie `X-API-Key: <INGEST_API_KEY>` sur chaque requête.

## Endpoints publics (X-API-Key requis)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/ingest/public/raw` | POST | Envoyer des raw items → raw_listings |
| `/api/v1/ingest/public/listings` | POST | Envoyer des listings normalisés |
| `/api/v1/ingest/public/process-raw` | POST | Traiter raw_listings → listings |
| `/api/v1/ingest/public/queue` | POST | Ajouter des URLs à la queue mobile.de |
| `/api/v1/ingest/public/queue/acquire` | POST | Acquérir le prochain item |
| `/api/v1/ingest/public/queue/:id/release` | POST | Marquer item ok/retry/error |

## Migrations (optionnelles)

Pour la queue mobile.de et le fix displacement :

```bash
cd backend
npm run migrate:020
# Exécute 020_add_mobile_de_fetch_queue.sql + 021_fix_displacement_column.sql
# Nécessite DATABASE_URL ou SUPABASE_DB_URL dans .env
```

**Si la connexion directe échoue** (DNS, firewall) :

```bash
# Option A : via API Supabase (Personal Access Token)
# Créer un token : https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_xxx npm run migrate:020:api

# Option B : copier le SQL et l'exécuter dans Supabase SQL Editor
npm run migrate:020:sql
# Puis coller dans : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql/new
```

## Test

```bash
cd backend
npm run test:ingest
```
