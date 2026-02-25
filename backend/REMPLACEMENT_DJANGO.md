# Remplacement de Django

Remplacer Django par un flux direct vers Supabase pour mobile.de (et autres sources).

## Architecture actuelle

```
Scraper mobile.de (Python/externe) → Django (75.119.141.234:8002)
                                          ↓
Node import (run-django-import-mobilede.js) → Supabase
```

## Architecture cible (sans Django)

```
Scraper mobile.de (Puppeteer intégré) → raw_listings → listings
     ou
Scraper externe → POST /api/v1/ingest/public/raw → Supabase
```

## Étapes

### 1. Migrer les données existantes (one-shot)

- **Option A** : Terminer l’import Django existant (status=OK ~1M listings)
- **Option B** : Import DB direct si tunnel SSH disponible : `npm run import:django-db`

### 2. Configurer le scraper mobile.de pour écrire dans Supabase

**Si scraper Python :**
```python
import requests
# Après chaque batch de listings
requests.post(
    "https://ton-api.carindex.com/api/v1/ingest/public/listings",
    json=listings_normalises,
    headers={"X-API-Key": "INGEST_API_KEY", "Content-Type": "application/json"}
)
```

**Si scraper envoie du raw :**
```python
requests.post(
    "https://ton-api.carindex.com/api/v1/ingest/public/raw",
    json={"items": [...], "source_platform": "mobile_de"},
    headers={"X-API-Key": "INGEST_API_KEY", "Content-Type": "application/json"}
)
```

### 3. Scraper intégré (Puppeteer)

Le backend inclut un scraper mobile.de sans Apify :
- Admin / auto-scraper : source `mobile.de` utilise Puppeteer directement
- Flux : `raw_listings` → `processRawListings` → `listings`

### 4. Désactiver l’import Django

```env
ENABLE_DJANGO_IMPORT=false
ENABLE_DJANGO_LEBONCOIN_IMPORT=false
```

### 5. (Optionnel) Créer un job de vérification

- Job quotidien qui compare le volume Supabase vs objectifs
- Alertes si chute anormale

## Prérequis

| Élément | Status |
|---------|--------|
| `INGEST_API_KEY` dans `.env` | À configurer |
| Ingest API déployée et accessible | Backend doit tourner |
| Mapping des champs Django → listings | Déjà dans `mapDjangoCarToListing` |
| Scraper mobile.de modifiable | Dépend de l’implémentation actuelle |

## Références

- `INGEST_DIRECT_SUPABASE.md` – doc ingest API
- `src/services/ingestService.js` – normalisation, bulk upsert
- `src/jobs/djangoImportJob.js` – mapping actuel (`mapDjangoCarToListing`)
