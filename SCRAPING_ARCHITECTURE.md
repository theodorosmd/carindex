# Carindex Scraping Architecture

## Overview

Carindex aggregates data from major automotive platforms across 20+ countries using a robust, scalable scraping infrastructure built on Apify. This document outlines the architecture, data sources, and technical implementation.

---

## Data Sources

### Primary Platforms

**Europe:**
- **AutoScout24**: Germany, Austria, Switzerland, Italy, Spain, Netherlands, Belgium, France
- **mobile.de**: Germany (primary), Austria
- **LeBonCoin**: France
- **Autoscout24.it**: Italy
- **Coches.net**: Spain
- **Autotrader.co.uk**: United Kingdom
- **Autoscout24.nl**: Netherlands
- **Autoscout24.be**: Belgium

**North America:**
- **Autotrader.com**: United States
- **Cars.com**: United States
- **Kijiji Autos**: Canada

**South America:**
- **Webmotors**: Brazil
- **Autocosmos**: Argentina

### Data Collection Frequency

- **Active Listings**: Scraped 3-4 times per day
- **Price Updates**: Monitored every 6 hours
- **New Listings**: Detected within 2 hours of publication
- **Historical Data**: Full database refresh monthly

---

## Architecture Overview

```
┌─────────────────┐
│  Apify Platform │
│  (Orchestration)│
└────────┬─────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
    ┌────▼────┐                          ┌────▼────┐
    │ Apify   │                          │ Apify   │
    │ Actors  │                          │ Actors  │
    │ (Scraper)│                          │(Monitor)│
    └────┬────┘                          └────┬────┘
         │                                     │
         │                                     │
    ┌────▼────────────────────────────────────▼────┐
    │         Data Processing Pipeline              │
    │  - Deduplication                              │
    │  - Normalization                              │
    │  - Validation                                 │
    │  - Enrichment                                 │
    └────────────────┬──────────────────────────────┘
                     │
                     │
              ┌──────▼──────┐
              │  Carindex   │
              │  Database   │
              └─────────────┘
```

---

## Apify Implementation

### Actor Structure

Each platform has a dedicated Apify actor configured for optimal scraping:

#### 1. AutoScout24 Scraper

**Actor Configuration:**
```javascript
{
  "name": "autoscout24-scraper",
  "version": "2.0",
  "input": {
    "country": "FR",
    "maxPages": 1000,
    "filters": {
      "minYear": null,
      "maxYear": null,
      "minPrice": null,
      "maxPrice": null
    }
  }
}
```

**Key Features:**
- Handles pagination automatically
- Extracts: brand, model, year, mileage, price, location, seller info, images
- Respects robots.txt and rate limits
- Handles dynamic content (React/Vue.js)

#### 2. mobile.de Scraper

**Actor Configuration:**
```javascript
{
  "name": "mobilede-scraper",
  "version": "1.5",
  "input": {
    "region": "all",
    "includeDetails": true,
    "extractImages": false
  }
}
```

**Key Features:**
- Specialized for German market
- Handles dealer vs. private seller distinction
- Extracts detailed specifications
- Monitors price changes

#### 3. LeBonCoin Scraper

**Actor Configuration:**
```javascript
{
  "name": "leboncoin-scraper",
  "version": "2.1",
  "input": {
    "category": "2", // Vehicles
    "regions": ["12", "75"], // Region codes
    "maxResults": 50000
  }
}
```

**Key Features:**
- Handles French regional structure
- Filters out non-vehicle listings
- Extracts contact information (when available)
- Monitors ad status (active/sold/removed)

### Scheduling

Apify actors are scheduled using Apify Schedules:

```javascript
{
  "name": "autoscout24-daily-scrape",
  "cronExpression": "0 */6 * * *", // Every 6 hours
  "actorId": "autoscout24-scraper",
  "input": {
    "country": "FR"
  }
}
```

---

## Data Processing Pipeline

### 1. Deduplication

**Challenge**: Same vehicle listed on multiple platforms or re-listed with slight variations.

**Solution**:
- Generate unique vehicle fingerprint: `hash(brand + model + year + mileage + location + price_range)`
- Match similar listings within 7-day window
- Merge data from multiple sources for richer dataset

**Algorithm**:
```python
def generate_fingerprint(listing):
    key = f"{listing['brand']}_{listing['model']}_{listing['year']}"
    key += f"_{normalize_mileage(listing['mileage'])}"
    key += f"_{normalize_location(listing['location'])}"
    return hashlib.md5(key.encode()).hexdigest()
```

### 2. Normalization

**Data Standardization**:
- **Brands**: "BMW", "B.M.W.", "bmw" → "BMW"
- **Models**: "320d", "320 d", "320D" → "320d"
- **Prices**: Convert to EUR, handle currency symbols
- **Mileage**: Convert to kilometers, handle "mi" vs "km"
- **Dates**: Standardize to ISO 8601 format
- **Locations**: Normalize city names, country codes

**Example**:
```python
def normalize_brand(brand):
    brand_map = {
        "mercedes": "Mercedes-Benz",
        "mercedes benz": "Mercedes-Benz",
        "mb": "Mercedes-Benz",
        "bmw": "BMW",
        "vw": "Volkswagen",
        "vw.": "Volkswagen"
    }
    return brand_map.get(brand.lower(), brand.title())
```

### 3. Validation

**Quality Checks**:
- Price within realistic range (€500 - €500,000)
- Year between 1990 and current year + 1
- Mileage reasonable for vehicle age
- Required fields present (brand, model, price)
- No obvious spam/fraud indicators

**Fraud Detection**:
- Suspiciously low prices
- Duplicate images across listings
- Suspicious seller patterns
- Keyword stuffing in descriptions

### 4. Enrichment

**Additional Data Sources**:
- Vehicle specifications from manufacturer databases
- Historical pricing trends
- Market segment classification
- Fuel type detection from model name
- Transmission type inference

---

## Data Storage

### Database Schema (Simplified)

```sql
-- Listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY,
    source_platform VARCHAR(50),
    source_listing_id VARCHAR(255),
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    mileage INTEGER,
    price DECIMAL(10,2),
    currency VARCHAR(3),
    location_city VARCHAR(100),
    location_country VARCHAR(2),
    seller_type VARCHAR(20), -- 'dealer' or 'private'
    url TEXT,
    images JSONB,
    specifications JSONB,
    posted_date TIMESTAMP,
    last_seen TIMESTAMP,
    status VARCHAR(20), -- 'active', 'sold', 'removed'
    fingerprint VARCHAR(64),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Market prices (calculated)
CREATE TABLE market_prices (
    id UUID PRIMARY KEY,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    mileage_range_start INTEGER,
    mileage_range_end INTEGER,
    country VARCHAR(2),
    market_price DECIMAL(10,2),
    confidence_index INTEGER,
    comparables_count INTEGER,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    price_median DECIMAL(10,2),
    average_sales_time_days INTEGER,
    calculated_at TIMESTAMP
);

-- Price history
CREATE TABLE price_history (
    listing_id UUID REFERENCES listings(id),
    price DECIMAL(10,2),
    recorded_at TIMESTAMP,
    PRIMARY KEY (listing_id, recorded_at)
);
```

---

## Monitoring & Reliability

### Health Checks

- **Actor Status**: Monitor Apify actor runs for failures
- **Data Freshness**: Alert if no new data for 12+ hours
- **Data Quality**: Track validation failure rates
- **Coverage**: Monitor listing counts per platform/country

### Error Handling

**Retry Logic**:
- Transient errors: 3 retries with exponential backoff
- Permanent errors: Log and skip, alert team
- Rate limiting: Automatic backoff and reschedule

**Fallback Strategies**:
- If primary scraper fails, use backup actor
- If platform changes structure, alert development team
- Maintain historical data during outages

---

## Compliance & Ethics

### Legal Compliance

- **robots.txt**: All scrapers respect robots.txt directives
- **Rate Limiting**: Conservative request rates (max 1 req/sec per domain)
- **Terms of Service**: Review and comply with each platform's ToS
- **Data Usage**: Only aggregate public listing data, no personal information

### Ethical Scraping

- **Respectful**: Don't overload servers
- **Transparent**: Identify as Carindex in user-agent
- **Fair Use**: Data used for market intelligence, not competitive scraping
- **Privacy**: No collection of seller contact info or personal data

---

## Performance Metrics

### Current Scale

- **Daily Listings Processed**: ~500,000
- **Active Listings in DB**: ~8.5 million
- **Historical Transactions**: ~12 million
- **Data Freshness**: < 6 hours average
- **Uptime**: 99.5%

### Optimization

- **Caching**: Cache frequently accessed market prices
- **Indexing**: Optimized database indexes for fast queries
- **Parallel Processing**: Multiple actors run concurrently
- **Incremental Updates**: Only process changed listings

---

## Future Enhancements

1. **Real-time Streaming**: WebSocket connections for instant updates
2. **ML-based Fraud Detection**: Improve spam/fraud filtering
3. **Image Analysis**: Extract vehicle condition from photos
4. **Sentiment Analysis**: Analyze listing descriptions for market signals
5. **Predictive Pricing**: ML models for price forecasting

---

## Technical Stack

- **Scraping**: Apify Platform
- **Data Processing**: Python (Pandas, NumPy)
- **Database**: PostgreSQL with TimescaleDB extension
- **Queue System**: Redis + Celery
- **Monitoring**: Prometheus + Grafana
- **Alerting**: PagerDuty

---

## Contact

For technical questions about the scraping architecture:
- Email: tech@carindex.com
- Documentation: https://docs.carindex.com/scraping


