# mobile.de Scraping – Oleg-Speed Optimizations

This document describes the optimizations applied to match Oleg's scraping speed (~86K listings/day) **without syncing with Oleg's Django data**.

## Changes Applied

### 1. Multiple Search URLs (21 URLs)
- **Before**: 1 base URL (all cars)
- **After**: Base URL + 20 make-specific URLs (VW, BMW, Mercedes, Audi, Opel, Ford, Renault, Skoda, Hyundai, Toyota, Nissan, Mazda, Volvo, Porsche, Seat, Fiat, Kia, Mini, Citroën, Peugeot)
- **Effect**: ~20× broader coverage per run; each make URL returns a different slice of the catalog

### 2. Parallel URL Processing
- **MOBILEDE_PARALLEL_URLS** (default: 2): Scrape 2 search URLs concurrently
- **Effect**: 2× faster when using multiple URLs

### 3. Page Concurrency (tuned for scrape.do 502/410)
- **MOBILEDE_CONCURRENT_PAGES**: 12 (default, was 24)
- **MOBILEDE_BATCH_DELAY_MS**: 800 ms (default, was 400)
- **MOBILEDE_MAX_PAGES**: 100 → 200 per URL
- **Effect**: ~3× faster page scraping, less idle time

### 4. Bulk Database Operations
- **addToQueue**: Per-item SELECT + UPSERT → single bulk upsert per 500 items
- **saveRawListings**: Per-item upsert → bulk upsert per 200 items
- **Effect**: ~10–50× faster DB writes

### 5. processRawListings Batch Size
- Limit increased from 5000 → 10000 per run
- **Effect**: Fewer processor runs between scrape batches

## Expected Throughput

| Config | Listings/Run | Listings/Day (1 run) | Listings/Day (4 runs) |
|--------|--------------|----------------------|------------------------|
| Before | ~2,000       | ~2,000               | ~8,000                 |
| After  | ~80,000+     | ~80,000              | ~320,000               |

*Assumes scrape.do rate limits allow. Tune `MOBILEDE_PARALLEL_URLS` and `MOBILEDE_CONCURRENT_PAGES` down if you hit 429s.*

## Environment Variables

```bash
# Défaut (limite 502/410 – export scrape.do 03/2026)
MOBILEDE_MAX_PAGES=200
MOBILEDE_CONCURRENT_PAGES=12
MOBILEDE_BATCH_DELAY_MS=800
MOBILEDE_PARALLEL_URLS=2

# Plus agressif (si peu d'erreurs)
MOBILEDE_CONCURRENT_PAGES=24
MOBILEDE_BATCH_DELAY_MS=400
MOBILEDE_PARALLEL_URLS=3
```

## scrape.do Considerations

- 410/429/502 → retry avec backoff 25s (410 = blocage/rate limit)
- Réduire concurrency si trop de 502/410
- `render=false` is used when possible (__INITIAL_STATE__ in HTML) – cheaper and faster
