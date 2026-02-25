# 🔧 Blocket.se Implementation for Sweden

## Overview

Blocket.se is the largest classifieds site in Sweden (equivalent to Leboncoin in France). To have Swedish sales data in Market Insights, you need to implement Blocket.se scraping.

---

## 📋 Implementation Steps

### 1. Create an Apify Actor for Blocket.se

**Option A: Use existing actor on Apify Store**
- Search for "blocket scraper" or "blocket.se" in Apify Store
- If available, use existing actor

**Option B: Create custom actor**
- Create new actor in Apify
- Use CheerioCrawler or PuppeteerCrawler
- Similar structure to `apify/actors/autoscout24-scraper/`

### 2. Add Support in Backend

#### 2.1 Add in `autoScraperService.js`

```javascript
// In backend/src/services/autoScraperService.js

case 'blocket':
  result = await runBlocketScraper(scraper.search_urls, options, progressCallback);
  break;
```

#### 2.2 Create `blocketService.js`

Create `backend/src/services/blocketService.js`:

```javascript
import { ApifyClient } from 'apify-client';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

export async function runBlocketScraper(searchUrls, options = {}, progressCallback = null) {
  try {
    const actorId = process.env.APIFY_BLOCKET_ACTOR_ID || 'your-actor-id';
    
    // Configuration similar to runAutoScout24Scraper
    const run = await client.actor(actorId).call({
      startUrls: searchUrls.map(url => ({ url })),
      maxPages: options.maxPages || 1000,
      // Other Blocket-specific options
    });

    // Process results and save them
    // Mapping similar to AutoScout24
    
    return {
      totalScraped: result.totalScraped,
      saved: result.saved,
      runId: run.id
    };
  } catch (error) {
    logger.error('Error running Blocket scraper', { error: error.message });
    throw error;
  }
}
```

#### 2.3 Blocket Data Mapping → Listings

In `blocketService.js`, create a mapping function:

```javascript
function mapBlocketDataToListing(item) {
  return {
    source_platform: 'blocket',
    source_listing_id: item.id || item.listingId,
    brand: normalizeBrand(item.brand || item.make),
    model: normalizeModel(item.model),
    year: extractYear(item.year || item.modelYear),
    mileage: convertMileage(item.mileage || item.mileageKm),
    price: parseFloat(item.price || item.priceSek),
    currency: 'SEK',
    location_city: item.location?.city || item.city,
    location_region: item.location?.region || item.region,
    location_country: 'SE',
    seller_type: item.sellerType || (item.dealer ? 'dealer' : 'private'),
    fuel_type: normalizeFuelType(item.fuelType || item.fuel),
    transmission: normalizeTransmission(item.transmission || item.gearbox),
    url: item.url || item.link,
    images: item.images || [],
    specifications: {
      power_hp: item.power || item.horsepower,
      displacement: item.engineSize,
      color: item.color,
      doors: item.doors,
      // ... other specifications
    },
    posted_date: parseDate(item.postedDate || item.date),
    description: item.description || item.text
  };
}
```

### 3. Configuration in Admin Dashboard

Once service is implemented, create an automatic scraper:

1. Go to `#/admin`
2. Create new automatic scraping
3. Configuration:
   - **Name**: `Blocket.se - Sweden`
   - **Source**: `blocket`
   - **Search URLs**:
     - `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`
     - Or by region if necessary
   - **Frequency**: Every 6 hours (`0 */6 * * *`)
   - **Max pages**: 1000

### 4. Environment Variables

Add in `.env`:

```bash
APIFY_BLOCKET_ACTOR_ID=your-actor-id-here
```

---

## 🔍 Blocket.se URL Structure

### Search URLs

**All cars in Sweden**:
```
https://www.blocket.se/annonser/hela_sverige/fordon/bilar
```

**By region**:
```
https://www.blocket.se/annonser/stockholm/fordon/bilar
https://www.blocket.se/annonser/goteborg/fordon/bilar
https://www.blocket.se/annonser/malmo/fordon/bilar
```

**With filters**:
```
https://www.blocket.se/annonser/hela_sverige/fordon/bilar?q=BMW
https://www.blocket.se/annonser/hela_sverige/fordon/bilar?price_min=100000&price_max=500000
```

---

## 📊 Data to Extract

### Required Fields
- `id` / `listingId`: Unique identifier
- `brand` / `make`: Brand
- `model`: Model
- `year` / `modelYear`: Year
- `mileage` / `mileageKm`: Mileage
- `price` / `priceSek`: Price in SEK
- `location`: City and region
- `url` / `link`: Listing URL

### Optional Fields
- `fuelType` / `fuel`: Fuel type
- `transmission` / `gearbox`: Transmission
- `power` / `horsepower`: Power
- `color`: Color
- `doors`: Number of doors
- `sellerType`: Seller type
- `images`: Images
- `description`: Description

---

## ✅ Verification

After implementation, verify that data is arriving:

```sql
-- Check Blocket listings
SELECT 
  source_platform,
  status,
  COUNT(*) as count,
  MAX(last_seen) as last_update
FROM listings
WHERE source_platform = 'blocket' 
  AND location_country = 'SE'
GROUP BY source_platform, status;
```

---

## 🚀 Alternative: Bilbasen.se

If Blocket.se is too complex, **Bilbasen.se** is a more specialized alternative:

- **URL**: `https://www.bilbasen.se/`
- **Advantage**: Car-specialized site, simpler structure
- **Implementation**: Same process as Blocket.se

---

## 📝 Notes

- Data must be stored with `location_country = 'SE'`
- System will automatically detect sales (`status = 'sold'`)
- Once sales are detected, they will appear in Market Insights
