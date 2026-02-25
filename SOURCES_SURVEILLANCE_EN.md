# 📊 Sources Monitored for Sales Monitoring

## Overview

The **recent sales monitoring** system monitors **ALL** active listings in the database, regardless of their source, provided they are in **France (FR)** or **Sweden (SE)**.

---

## ✅ Available and Configured Sources

### 🇫🇷 France

#### 1. **AutoScout24** (`autoscout24`)
- **URLs**: `https://www.autoscout24.fr/lst?cy=FR`
- **Status**: ✅ Implemented (via Apify)
- **Configuration**: Via Admin Dashboard → Automatic scrapings
- **Countries**: FR, DE, IT, ES, NL, BE, AT, CH

#### 2. **LeBonCoin** (`leboncoin`)
- **URLs**: `https://www.leboncoin.fr/recherche?category=2&text=voiture`
- **Status**: ✅ Implemented (via Apify actor `3x1t~leboncoin-vehicle-scraper-ppe`)
- **Configuration**: Via Admin Dashboard → Automatic scrapings
- **Countries**: FR only

#### 3. **mobile.de** (`mobile.de`)
- **URLs**: `https://www.mobile.de/fahrzeuge/search.html`
- **Status**: ✅ Implemented (via Apify)
- **Configuration**: Via Admin Dashboard → Automatic scrapings
- **Countries**: DE, AT (but can be filtered for FR if necessary)

---

### 🇸🇪 Sweden

#### 4. **Blocket.se** (`blocket`)
- **URLs**: `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`
- **Status**: ✅ Implemented (via Puppeteer)
- **Configuration**: Via Admin Dashboard → Automatic scrapings
- **Countries**: SE only

#### 5. **Bilweb.se** (`bilweb`)
- **URLs**: `https://www.bilweb.se/`
- **Status**: ✅ Implemented (via Puppeteer)
- **Configuration**: Via Admin Dashboard → Automatic scrapings
- **Countries**: SE only

#### 6. **Bytbil.com** (`bytbil`)
- **URLs**: `https://www.bytbil.com/`
- **Status**: ✅ Implemented (via Puppeteer)
- **Configuration**: Via Admin Dashboard → Automatic scrapings
- **Countries**: SE only

---

## 🔍 How to Check Active Sources

### 1. Check in Database

```sql
-- See all sources and their number of active listings
SELECT 
  source_platform,
  location_country,
  status,
  COUNT(*) as count,
  MAX(last_seen) as last_update
FROM listings
WHERE location_country IN ('FR', 'SE')
GROUP BY source_platform, location_country, status
ORDER BY location_country, source_platform, status;
```

### 2. Check Configured Scrapers

```sql
-- See all configured automatic scrapers
SELECT 
  id,
  name,
  source,
  enabled,
  schedule_cron,
  last_run_at,
  last_run_status,
  last_run_result
FROM auto_scrapers
WHERE enabled = true
ORDER BY source, created_at;
```

### 3. Via Admin Dashboard

1. Go to `#/admin`
2. **"Automatic scrapings"** section
3. See list of configured scrapers and their status

---

## 📋 Sources Monitored by Detection Job

The `salesDetectionJob.js` job monitors **ALL** active listings with:
- `status = 'active'`
- `location_country IN ('FR', 'SE')`
- `last_seen < (now - 7 days)` (not updated for 7 days)
- `first_seen < (now - 3 days)` (existing for at least 3 days)

**Regardless of source** (`source_platform`), all active listings are monitored.

---

## 🎯 Currently Used Sources

To know which sources are **actually active** in your database:

### SQL Query

```sql
-- See sources with active listings in last 30 days
SELECT 
  source_platform,
  location_country,
  COUNT(*) as active_listings,
  COUNT(CASE WHEN last_seen > NOW() - INTERVAL '7 days' THEN 1 END) as recently_updated,
  COUNT(CASE WHEN status = 'sold' AND sold_date > NOW() - INTERVAL '30 days' THEN 1 END) as recent_sales
FROM listings
WHERE location_country IN ('FR', 'SE')
GROUP BY source_platform, location_country
ORDER BY location_country, active_listings DESC;
```

---

## ⚙️ Source Configuration

### To Add a Source

1. **Create the service** (ex: `backend/src/services/[source]Service.js`)
2. **Integrate it** in `autoScraperService.js`
3. **Create an automatic scraper** via Admin Dashboard

### Ready-to-Use Sources

- ✅ **AutoScout24**: Ready (via Apify)
- ✅ **LeBonCoin**: Ready (via Apify)
- ✅ **mobile.de**: Ready (via Apify)
- ✅ **Blocket.se**: Ready (via Puppeteer)
- ✅ **Bilweb.se**: Ready (via Puppeteer)
- ✅ **Bytbil.com**: Ready (via Puppeteer)

---

## 📊 Example Result

If you have configured:
- AutoScout24 FR → listings with `source_platform = 'autoscout24'` and `location_country = 'FR'`
- LeBonCoin → listings with `source_platform = 'leboncoin'` and `location_country = 'FR'`
- Blocket.se → listings with `source_platform = 'blocket'` and `location_country = 'SE'`

**All** these listings will be monitored by the sales detection job, and will appear in recent sales monitoring.

---

## 🔧 To Activate a Source

1. **Go to Admin Dashboard**: `#/admin`
2. **"Automatic scrapings"** section
3. **"+ New automatic scraping"**
4. **Choose source** in dropdown:
   - `autoscout24`
   - `leboncoin`
   - `mobile.de`
   - `blocket` (Sweden)
   - `bilweb` (Sweden)
   - `bytbil` (Sweden)
5. **Configure URLs** and schedule
6. **Enable** the scraper

Once enabled, listings from this source will automatically be monitored by the sales detection system.
