# Auction → Resale Margin Calculator (South of France)

## Overview

The Auction Margin Calculator is a feature that calculates the resale margin for vehicles purchased at auctions (e.g., KVD, Swedish auctions) when reselling in the South of France. It:

1. Fetches comparable listings from Leboncoin
2. Matches them intelligently to the auction listing
3. Estimates a realistic selling price range
4. Computes margin after all costs

## Configuration

### Environment Variables

Add these to `backend/.env`:

```env
# Default FX rate (SEK to EUR)
DEFAULT_FX_RATE_SEK_EUR=0.085

# Default costs (EUR)
DEFAULT_TRANSPORT_COST_EUR=1500
DEFAULT_REGISTRATION_EUR=0
DEFAULT_RECONDITIONING_EUR=500
DEFAULT_TIRES_COST_EUR=300
DEFAULT_CONTINGENCY_EUR=200

# Default target departments (South of France)
DEFAULT_SOUTH_FRANCE_DEPARTMENTS=13,83,06,84,34,30
```

**Department Codes:**
- 13: Bouches-du-Rhône (Marseille)
- 83: Var (Toulon)
- 06: Alpes-Maritimes (Nice)
- 84: Vaucluse (Avignon)
- 34: Hérault (Montpellier)
- 30: Gard (Nîmes)

### Cost Configuration

Costs can be configured per request or use defaults:

- **Transport**: Cost to transport vehicle from Sweden to France (default: 1500 EUR)
- **Registration**: French registration costs (default: 0 EUR)
- **Reconditioning Total**: Total budget for vehicle reconditioning, including tires, repairs, contingency, etc. (default: 500 EUR, auto-calculated from auction listing condition notes if available)

### VAT Modes

Two VAT handling modes are supported:

1. **margin_scheme** (default): No VAT on purchase, VAT only on margin (simplified tax regime)
2. **vat_reclaimable**: VAT on purchase can be reclaimed, treat purchase as TTC

**Automatic Detection**: The VAT mode is automatically detected from the auction listing. For KVD listings, if "Avlyftbar moms: Ja" (VAT deductible: Yes) is found, the mode is set to `vat_reclaimable`, otherwise `margin_scheme`.

## API Endpoint

### POST `/api/v1/margin/calculate`

Calculate margin for an auction listing.

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "auction_listing_id": "optional-uuid",  // If provided, fetch from DB
  "auction_listing": {                    // Required if auction_listing_id not provided
    "source": "kvd",
    "source_listing_id": "12345",
    "brand": "BMW",
    "model": "3 Series",
    "trim": "M Sport",
    "year": 2020,
    "fuel_type": "diesel",
    "transmission": "automatic",
    "power_hp": 190,
    "mileage": 50000,
    "body_type": "sedan",
    "color": "black",
    "vin": "optional",
    "auction_price_sek": 200000,
    "auction_fee_eur": 500,
    "url": "https://..."
  },
  "target_departments": [13, 83, 6, 84, 34, 30],  // Optional, defaults to South of France
  "fx_rate": 0.085,                              // Optional, defaults to env var
  "costs": {                                     // Optional, uses defaults if not provided
    "auction_fee_eur": 500,
    "transport_eur": 1500,
    "registration_eur": 0,
    "reconditioning_total_eur": 500,            // Total reconditioning (includes tires, repairs, contingency)
    "vat_mode": "margin_scheme"                 // Auto-detected from auction listing if not provided
  }
}
```

**Response:**

```json
{
  "success": true,
  "correlation_id": "uuid",
  "auction_listing_id": "uuid",
  "price_estimate": {
    "low": 20000,
    "mid": 25000,
    "high": 30000
  },
  "costs_breakdown": {
    "auction_price_eur": 17000,
    "auction_fee_eur": 500,
    "transport_eur": 1500,
    "registration_eur": 0,
    "reconditioning_eur": 500,
    "tires_eur": 300,
    "contingency_eur": 200,
    "total_eur": 20000,
    "vat_mode": "margin_scheme"
  },
  "margin": {
    "low": 0,
    "mid": 5000,
    "high": 10000
  },
  "comparables": [
    {
      "id": "uuid",
      "url": "https://...",
      "title": "BMW 3 Series 2020",
      "price": 28000,
      "year": 2020,
      "mileage": 45000,
      "dept": "13",
      "seller_type": "pro",
      "match_score": 0.85
    }
  ],
  "debug": {
    "query_used": "leboncoin_search",
    "outliers_removed_count": 2,
    "total_comparables_fetched": 50,
    "comparables_after_matching": 12
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `404 Not Found`: Auction listing not found (if using auction_listing_id)
- `401 Unauthorized`: Missing or invalid authentication token

## How It Works

### 1. Comparable Fetching

- Builds Leboncoin search URL with filters:
  - Brand + model
  - Year range: ±1 year
  - Mileage range: ±20%
  - Fuel type (exact match)
  - Transmission (exact match)
  - Departments filter
- Uses Apify actor (`3x1t~leboncoin-vehicle-scraper-ppe`) to fetch results
- Caches results for 24 hours (keyed by search parameters)
- Handles rate limiting with exponential backoff

### 2. Matching Algorithm

Calculates match score (0-1) based on:
- **Brand + model tokens** (40% weight)
- **Fuel + gearbox exact match** (30% weight)
- **Year difference penalty** (-0.05 per year)
- **Mileage difference penalty** (-0.0001 per km, normalized)
- **Trim keywords overlap** (20% weight)
- **Power difference** (10% weight, if both present)

Selects top 15 comparables with score >= 0.55, then picks top 8.

### 3. Outlier Removal

Uses IQR (Interquartile Range) method:
- Removes prices outside Q1 - 1.5*IQR to Q3 + 1.5*IQR
- Ensures price estimates are not skewed by outliers

### 4. Price Estimation

- Calculates 25th percentile (low), median (mid), 75th percentile (high)
- Applies mileage/year adjustment:
  - If enough data: linear regression
  - Else: heuristic (-0.03 €/km above median, +500 €/year above median)

### 5. Cost Calculation

Total costs include:
- Auction price (SEK → EUR conversion)
- Auction fee
- Transport
- Registration
- Reconditioning
- Tires
- Contingency

### 6. Margin Calculation

Margin = Price Estimate - Total Costs

Returns low, mid, and high margins based on price estimate percentiles.

## Database Schema

### Tables

1. **auction_listings**: Stores auction listing data
2. **comparable_listings**: Stores fetched Leboncoin comparables with match scores
3. **margin_calculations**: Stores calculation results

See migration file: `backend/src/database/migrations/007_add_auction_margin_tables.sql`

## Running Tests

```bash
cd backend
npm test -- marginCalculation.test.js
```

Or run all tests:

```bash
npm test
```

## Troubleshooting

### No Comparables Found

- Check that brand/model names are correct
- Verify Leboncoin has listings for that vehicle in target departments
- Check Apify API token is valid
- Review logs for Leboncoin scraping errors

### Rate Limiting (429/403)

- The service implements exponential backoff
- Results are cached for 24 hours to reduce API calls
- If persistent, check Apify quota/limits

### Price Estimates Seem Off

- Check that enough comparables were found (need at least 4-8)
- Verify outlier removal is working (check debug.outliers_removed_count)
- Review match scores - low scores indicate poor matches

### Margin Calculation Errors

- Verify all required fields are provided
- Check FX rate is correct (default 0.085 SEK/EUR)
- Ensure costs are in EUR, auction price in SEK

## Frontend Usage

Access the calculator at: `#/auction-margin`

1. Fill in auction listing details
2. Configure costs (or use defaults)
3. Click "Calculer la marge Sud de la France"
4. View results:
   - Price estimates (low/mid/high)
   - Costs breakdown
   - Margins (green if positive, red if negative)
   - Top 8 comparables with match scores

## Future Enhancements

- Support for other auction sources
- Additional regions beyond South of France
- Historical margin tracking
- Export calculations to PDF/CSV
- Integration with auction listing management
