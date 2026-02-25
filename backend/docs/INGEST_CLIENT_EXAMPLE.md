# Ingestion API - Client Example

This example shows how to create a run, ingest listings, and finalize the run.

## 1) Create a run

```
POST /api/v1/ingest/runs
Authorization: Bearer <token>
Content-Type: application/json

{
  "source_platform": "bytbil",
  "status": "running",
  "webhook_url": "https://your-webhook.example.com"
}
```

## 2) Ingest listings (batch)

```
POST /api/v1/ingest/listings
Authorization: Bearer <token>
Content-Type: application/json

{
  "listings": [
    {
      "source_platform": "bytbil",
      "source_listing_id": "12345",
      "brand": "Volvo",
      "model": "XC60",
      "year": 2019,
      "mileage": 85000,
      "price": 289000,
      "currency": "SEK",
      "location_country": "SE",
      "location_city": "Stockholm",
      "url": "https://www.bytbil.com/...",
      "images": ["https://..."],
      "specifications": {"fuel_type": "diesel"},
      "run_id": "<run_id>"
    }
  ]
}
```

## 3) Finalize the run

```
PATCH /api/v1/ingest/runs/<run_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "success",
  "total_scraped": 100,
  "total_saved": 90,
  "total_failed": 10
}
```

## 4) List runs with date filters

```
GET /api/v1/ingest/runs?started_from=2026-02-01T00:00:00Z&started_to=2026-02-05T23:59:59Z&status=success
Authorization: Bearer <token>
```

## 5) Get listings for a run

```
GET /api/v1/ingest/runs/<run_id>/listings?limit=50&offset=0
Authorization: Bearer <token>
```

## 6) Export runs as CSV (with filters)

```
GET /api/v1/ingest/runs/export/csv?started_from=2026-02-01T00:00:00Z&started_to=2026-02-05T23:59:59Z&status=success
Authorization: Bearer <token>
```

## 7) Export listings for a run (CSV)

```
GET /api/v1/ingest/runs/<run_id>/listings/export/csv
Authorization: Bearer <token>
```

## Environment

```
INGEST_MAX_BATCH=500
INGEST_RUN_WEBHOOK_URL=https://your-webhook.example.com
```
