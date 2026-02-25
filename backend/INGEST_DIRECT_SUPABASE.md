# Ingest direct vers Supabase

Ajouter des listings directement dans Supabase, sans passer par Django.

## 1. Via script (fichier JSON/CSV)

```bash
cd backend

# Depuis un fichier JSON
node src/scripts/ingest-from-file.js data/listings.json

# Avec source custom
node src/scripts/ingest-from-file.js data/listings.json --source custom

# Batch de 200
node src/scripts/ingest-from-file.js data/listings.json --batch 200
```

**Format JSON** : tableau d'objets avec au minimum :
```json
[
  {
    "source_platform": "custom",
    "source_listing_id": "123",
    "brand": "volkswagen",
    "model": "golf",
    "price": 15000,
    "url": "https://...",
    "location_country": "DE",
    "year": 2020,
    "mileage": 50000
  }
]
```

## 2. Via API (avec clé API)

Ajoute dans `.env` :
```
INGEST_API_KEY=ton-secret-long-et-securise
```

Puis :
```bash
curl -X POST http://localhost:3001/api/v1/ingest/public/listings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ton-secret-long-et-securise" \
  -d '[{"source_platform":"custom","source_listing_id":"1","brand":"audi","model":"a3","price":20000,"url":"https://example.com/1","location_country":"FR"}]'
```

**Endpoints :**
- `POST /api/v1/ingest/public/listings` – listings normalisés
- `POST /api/v1/ingest/public/raw` – raw scraped items `{ items: [...], source_platform: "..." }`

## 3. Depuis un scraper Python / autre (mobile.de, etc.)

```python
import requests
# Listings normalisés
listings = [...]  # tes données
requests.post(
    "https://ton-api.com/api/v1/ingest/public/listings",
    json=listings,
    headers={"X-API-Key": "ta-cle", "Content-Type": "application/json"}
)

# Ou raw scraped (sera mappé par le backend)
requests.post(
    "https://ton-api.com/api/v1/ingest/public/raw",
    json={"items": [...], "source_platform": "mobile_de"},
    headers={"X-API-Key": "ta-cle", "Content-Type": "application/json"}
)
```

## Champs requis (minimum)

- `source_platform` (ex: custom, leboncoin)
- `source_listing_id` (unique par source)
- `brand`, `model`, `price`, `url`, `location_country`

Optionnels : `year` (défaut 2000), `mileage` (défaut 0)
