# 🚀 Guide: Complete Initial Scraping

## Objective

Fill the database with **all available listings** before switching to daily incremental scraping.

## 📋 Steps to Start a Complete Initial Scraping

### 1. Prepare Search URLs

For each source, you need to create search URLs that cover **all listings**:

#### AutoScout24

**Option A: Generic URL (all listings)**
```
https://www.autoscout24.fr/lst?sort=standard&desc=0
```

**Option B: By Brand (more efficient)**
```
https://www.autoscout24.fr/lst?make=BMW
https://www.autoscout24.fr/lst?make=Mercedes-Benz
https://www.autoscout24.fr/lst?make=Audi
https://www.autoscout24.fr/lst?make=Volkswagen
https://www.autoscout24.fr/lst?make=Opel
https://www.autoscout24.fr/lst?make=Ford
... (all brands)
```

**Option C: By Country**
```
https://www.autoscout24.fr/lst?cy=FR
https://www.autoscout24.de/lst?cy=DE
https://www.autoscout24.it/lst?cy=IT
```

#### mobile.de

**Option A: Generic URL**
```
https://www.mobile.de/fahrzeuge/search.html
```

**Option B: By Brand**
```
https://www.mobile.de/fahrzeuge/suche.html?ms=1900%3B35%3B%3B%3B&mk=1900&mk=3500
```

#### LeBonCoin

**Option A: Generic URL**
```
https://www.leboncoin.fr/recherche?category=2&text=voiture
```

**Option B: By Region**
```
https://www.leboncoin.fr/recherche?category=2&text=voiture&locations=Paris__48.856614_2.3522219_3578
https://www.leboncoin.fr/recherche?category=2&text=voiture&locations=Lyon__45.764043_4.835659_69000
```

### 2. Create a "No Limit" Automatic Scraping

#### Via Admin Dashboard

1. **Go to Admin Dashboard** (`#/admin`)
2. **Click on "+ New automatic scraping"**
3. **Fill out the form**:
   - **Name**: `Complete initial scraping - [Source]`
   - **Source**: Select the source (AutoScout24, mobile.de, LeBonCoin)
   - **Search URL(s)**: Paste all your URLs (one per line)
   - **Check "No limit"**: ✅ Important to scrape all listings
   - **Schedule**: `0 0 * * *` (once per day at midnight) - or disable it after first run
   - **Enable**: ✅ Check to activate

4. **Click "Save"**

#### Configuration Example

```
Name: Complete initial scraping - AutoScout24
Source: autoscout24
URLs:
https://www.autoscout24.fr/lst?make=BMW
https://www.autoscout24.fr/lst?make=Mercedes-Benz
https://www.autoscout24.fr/lst?make=Audi
https://www.autoscout24.fr/lst?make=Volkswagen
https://www.autoscout24.fr/lst?make=Opel
https://www.autoscout24.fr/lst?make=Ford
https://www.autoscout24.fr/lst?make=Peugeot
https://www.autoscout24.fr/lst?make=Renault
... (add all brands)

Limit: ✅ No limit
Schedule: 0 0 * * * (or disable after first run)
Active: ✅ Yes
```

### 3. Launch Initial Scraping

#### Option A: Launch Manually (recommended for first run)

1. **Go to "Automatic scrapings" section**
2. **Find your initial scraping**
3. **Click "Run"**
4. **Wait for completion** (may take several hours for millions of listings)

#### Option B: Let Schedule Execute

If you configured a schedule, scraping will launch automatically.

⚠️ **Warning**: For initial scraping, it's recommended to:
- Launch manually the first time
- Disable scraping after first run
- Then create a new incremental scraping for daily updates

### 4. Track Progress

#### In Admin Dashboard

- **Status**: Shows "⏳ In progress" during scraping
- **Results**: Shows number of listings scraped and saved
- **Auto-refresh**: List updates automatically every 10 seconds

#### In Server Logs

```bash
# In terminal where backend is running
# You'll see logs like:
[INFO] Starting AutoScout24 scraper
[INFO] AutoScout24 scraper started { runId: 'xxx' }
[INFO] AutoScout24 scraper completed { itemsCount: 50000 }
[INFO] Saved 49500 listings to database
```

### 5. Verify Results

#### In Admin Dashboard

1. **"Global Statistics" section**:
   - Check total number of listings
   - Check distribution by source

2. **"Automatic scrapings" section**:
   - Check last execution status
   - Check number of listings scraped vs saved

#### In Database

```sql
-- Check total number of listings
SELECT COUNT(*) FROM listings;

-- Check by source
SELECT source_platform, COUNT(*) 
FROM listings 
GROUP BY source_platform;

-- Check recent listings
SELECT COUNT(*) 
FROM listings 
WHERE created_at > NOW() - INTERVAL '1 day';
```

## ⚙️ Recommended Configuration for Initial Scraping

### Strategy by Source

#### AutoScout24
- **URLs**: One URL per brand (or generic URL)
- **Limit**: No limit ✅
- **Frequency**: Once only (disable after)
- **Estimated time**: 2-6 hours for 1M listings

#### mobile.de
- **URLs**: One URL per brand (or generic URL)
- **Limit**: No limit ✅
- **Frequency**: Once only (disable after)
- **Estimated time**: 2-6 hours for 1M listings

#### LeBonCoin
- **URLs**: One URL per region (or generic URL)
- **Limit**: No limit ✅
- **Frequency**: Once only (disable after)
- **Estimated time**: 3-8 hours for 1M listings

## 💰 Estimated Cost of Initial Scraping

### For 1 million listings
- **AutoScout24**: ~€50-100
- **mobile.de**: ~€50-100
- **LeBonCoin**: ~€50-100

### For 15 million listings
- **Total**: ~€750-1500 (one-time)

⚠️ **Important**: Cost depends on your Apify plan and number of listings actually available.

## 🎯 After Initial Scraping

### 1. Disable Complete Scraping

Once initial scraping is complete:
1. **Go to "Automatic scrapings"**
2. **Find your initial scraping**
3. **Click "Edit"**
4. **Uncheck "Enable this automatic scraping"**
5. **Save**

### 2. Create Incremental Scraping

Create a **new automatic scraping** for daily updates:

```
Name: Incremental scraping - AutoScout24
Source: autoscout24
URLs: (same URLs as initial scraping)
Limit: 1000 listings (incremental scraping)
Schedule: 0 */6 * * * (every 6 hours)
Active: ✅ Yes
```

### 3. Verify Data

- Verify listings are in database
- Test a search on frontend
- Verify prices are correct

## 🔧 Troubleshooting

### Scraping Stops Before Completion

**Cause**: Apify limit reached or timeout

**Solution**:
1. Check logs to see where it stopped
2. Create new scraping with remaining URLs
3. Or restart scraping (duplicates will be ignored)

### Some Listings Not Scraped

**Cause**: Incomplete search URLs

**Solution**:
1. Verify you covered all brands/regions
2. Add missing URLs in new scraping
3. Restart for missing listings

### Scraping Takes Too Long

**Cause**: Too many listings to scrape

**Solution**:
1. This is normal for initial scraping (several hours)
2. Scraping continues in background
3. You can close browser, scraping continues on server

## 📊 Complete Example: AutoScout24 Initial Scraping

### Step 1: Prepare URLs

Create a text file with all URLs:

```
https://www.autoscout24.fr/lst?make=BMW
https://www.autoscout24.fr/lst?make=Mercedes-Benz
https://www.autoscout24.fr/lst?make=Audi
https://www.autoscout24.fr/lst?make=Volkswagen
https://www.autoscout24.fr/lst?make=Opel
https://www.autoscout24.fr/lst?make=Ford
https://www.autoscout24.fr/lst?make=Peugeot
https://www.autoscout24.fr/lst?make=Renault
https://www.autoscout24.fr/lst?make=Citroen
https://www.autoscout24.fr/lst?make=Fiat
... (add all brands)
```

### Step 2: Create Scraping

1. Admin Dashboard → "+ New automatic scraping"
2. Name: `Complete initial scraping - AutoScout24`
3. Source: `autoscout24`
4. URLs: Paste all URLs (one per line)
5. ✅ Check "No limit"
6. Schedule: `0 0 * * *` (or disable after)
7. ✅ Enable
8. Save

### Step 3: Launch

1. Click "Run" on created scraping
2. Wait (several hours)
3. Check results in dashboard

### Step 4: Switch to Incremental Scraping

1. Disable initial scraping
2. Create new scraping with same URLs but limit to 1000
3. Configure schedule every 6 hours

## ✅ Startup Checklist

- [ ] Search URLs prepared for each source
- [ ] Automatic scraping created with "No limit"
- [ ] Scraping launched manually or via schedule
- [ ] Progress tracked in dashboard
- [ ] Results verified after completion
- [ ] Initial scraping disabled after completion
- [ ] Incremental scraping created for updates

## 🎉 Let's Go!

Once initial scraping is complete, you'll have a complete database and can switch to daily incremental scraping to keep data up-to-date at lower cost.
