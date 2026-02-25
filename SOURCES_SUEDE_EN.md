# 🇸🇪 Data Sources for Sweden

## Overview

To get car data in Sweden (SE) for Market Insights, you have several options:

---

## ✅ Currently Available Sources

### 1. **Swedish Auctions (KVD & others)**

**Status**: ✅ **Already implemented**

The system can parse Swedish auction URLs:
- **KVD.se** (`https://www.kvd.se/auktion/...`)
- **Auktionsverket.se**
- **Auctionet.se**
- **Bilwebauktion.se**

**Usage**:
- This data is used for **margin evaluations** (auction margin calculator)
- Data is stored in `auction_listings` with `source = 'kvd'` or `'swedish_auction'`
- **Limitation**: These are auctions, not private/professional sales

**How to add data**:
- Use margin calculator: `#/auction-margin`
- Paste KVD auction URLs
- Data is parsed and stored automatically

---

## 🔧 Sources to Configure for Listings (Sales)

**⚠️ Note**: AutoScout24.se does not have listings in Sweden.

To have **sales listings** (like Leboncoin for France), you need to configure a scraper for one of these Swedish platforms:

### Option 1: Blocket.se (Recommended - Swedish classifieds site)

**URL**: `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`

**Status**: ⚠️ **Requires custom Apify scraper**

**Required configuration**:
- Create Apify actor for Blocket.se
- Integrate in `autoScraperService.js`
- Add data mapping in `apifyService.js`

**URL structure**:
- General search: `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`
- By region: `https://www.blocket.se/annonser/[region]/fordon/bilar`
- By brand: `https://www.blocket.se/annonser/hela_sverige/fordon/bilar?q=[brand]`

### Option 2: Bilweb.se (Specialized car site)

**URL**: `https://www.bilweb.se/`

**Status**: ⚠️ **Requires custom Apify scraper**

**Note**: Bilweb is one of the largest car markets in Sweden, with vehicles from many dealerships

### Option 3: Bytbil.com (Used car site)

**URL**: `https://www.bytbil.com/`

**Status**: ⚠️ **Requires custom Apify scraper**

**Note**: ~400,000 unique visitors per month, specialized in used cars from dealerships

---

## 📊 Data Currently in Database

To check what Swedish data you already have:

```sql
-- Check Swedish listings
SELECT COUNT(*), source_platform 
FROM listings 
WHERE location_country = 'SE' 
GROUP BY source_platform;

-- Check Swedish auctions
SELECT COUNT(*), source 
FROM auction_listings 
WHERE source IN ('kvd', 'swedish_auction')
GROUP BY source;
```

---

## 🚀 Recommended Actions

### To have Swedish sales data:

1. **Recommended Option**: Blocket.se
   - **Create Apify actor** for Blocket.se (or use existing actor)
   - **Add support** in `backend/src/services/autoScraperService.js`
   - **Configure mapping** in `apifyService.js`
   - **Create automatic scraper** in Admin Dashboard with:
     - Source: `blocket` (to add)
     - URL: `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`

2. **Alternative Option**: Bilbasen.se or Bilweb.se
   - Same process as Blocket.se
   - Bilbasen is generally more car-specialized

### For auctions (already functional):

- Use margin calculator: `#/auction-margin`
- Paste KVD URLs
- Data is automatically parsed and stored

---

## 🔍 Data Verification

After configuration, verify that data is arriving:

```sql
-- Check new Swedish data
SELECT 
  location_country,
  source_platform,
  COUNT(*) as count,
  MAX(last_seen) as last_update
FROM listings
WHERE location_country = 'SE'
GROUP BY location_country, source_platform
ORDER BY last_update DESC;
```

---

## 📝 Technical Notes

- Auction data (KVD) is in `auction_listings`
- Sales data must be in `listings` with `location_country = 'SE'`
- Market Insights only use data from `listings` with `status = 'sold'`
- For Swedish insights to work, need listings with `status = 'sold'` and `location_country = 'SE'`

---

## ⚠️ Important

**Currently**, if you only have auction data (KVD), Swedish Market Insights will be **empty** because:
- Auctions are in `auction_listings` (not `listings`)
- Market Insights search in `listings` with `status = 'sold'`

**Solution**: ✅ **IMPLEMENTED** - Scrapers for **Blocket.se**, **Bilweb.se**, and **Bytbil.com** are now available!

**Recommendation**: Start with **Blocket.se** as it's the most visited platform in Sweden (~17M visits/month).

## ✅ Implementation Completed

The 3 Swedish scraping services have been created:
- ✅ `backend/src/services/blocketService.js` - Blocket.se scraper
- ✅ `backend/src/services/bilwebService.js` - Bilweb.se scraper  
- ✅ `backend/src/services/bytbilService.js` - Bytbil.com scraper

**Integration**: The 3 sources are integrated in `autoScraperService.js` and can be used via Admin Dashboard.

### How to Use

1. **Go to Admin Dashboard**: `#/admin`
2. **Create new automatic scraping**
3. **Configuration for Blocket.se**:
   - Name: `Blocket.se - Sweden`
   - Source: `blocket`
   - URLs: `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`
   - Frequency: Every 6 hours (`0 */6 * * *`)

4. **Configuration for Bilweb.se**:
   - Name: `Bilweb.se - Sweden`
   - Source: `bilweb`
   - URLs: `https://www.bilweb.se/` (adjust according to site structure)
   - Frequency: Every 6 hours

5. **Configuration for Bytbil.com**:
   - Name: `Bytbil.com - Sweden`
   - Source: `bytbil`
   - URLs: `https://www.bytbil.com/` (adjust according to site structure)
   - Frequency: Every 6 hours

**Note**: Scrapers use Puppeteer (like Leboncoin) as there are no Apify actors available for these platforms.
