# 🎯 Scraping Strategy for Carindex

> 📖 **Practical guide**: To start a complete initial scraping, see [GUIDE_SCRAPING_INITIAL.md](./GUIDE_SCRAPING_INITIAL.md)

## ❌ Why NOT scrape everything every day?

### Problems with daily complete scraping:
1. **High cost**: Scraping 15M listings every day = huge Apify costs
2. **Redundancy**: 95% of listings are identical from one day to the next
3. **Processing time**: Several hours to scrape everything
4. **Server resources**: Unnecessary load on database

## ✅ Recommended Strategies

### 1. **Incremental Scraping (RECOMMENDED)** ⭐

**Principle**: Only scrape new listings

**How it works**:
- Scrape only the first pages (new listings)
- Sites generally sort by publication date (newest first)
- System automatically detects duplicates

**Advantages**:
- ✅ Cost reduced by 90-95%
- ✅ Scraping time divided by 10-20
- ✅ Quick update (new listings in a few minutes)
- ✅ Price updates for existing listings

**Recommended configuration**:
```
- Frequency: Every 6 hours
- Limit: 500-1000 listings per URL (first pages)
- Result: ~5000-10000 new listings/day
```

### 2. **Weekly Complete Scraping**

**Principle**: Scrape entire catalog once per week

**When to use**:
- To recover missed listings
- To update listings that changed category
- To clean up deleted listings

**Recommended configuration**:
```
- Frequency: 1x per week (Sunday morning)
- Limit: No limit (all listings)
- Result: Complete catalog update
```

### 3. **Targeted Scraping by Brand/Model**

**Principle**: Scrape only certain popular brands/models

**When to use**:
- For highly demanded brands (BMW, Mercedes, Audi, etc.)
- For specific models searched by your customers
- To optimize costs on profitable segments

**Recommended configuration**:
```
- Frequency: Every 3-6 hours for popular brands
- Limit: No limit for targeted brands
- Result: Complete coverage of priority segments
```

### 4. **On-Demand Scraping**

**Principle**: Scrape only when a user performs a search

**When to use**:
- For very specific searches
- To complete missing data
- For occasional needs

**Recommended configuration**:
```
- Trigger: Manual via admin dashboard
- Limit: 100-500 listings
- Result: Fresh data for specific search
```

## 📊 Recommendation for Carindex V1

### Daily Incremental Scraping (hybrid strategy)

**Optimal configuration**:

1. **Incremental scraping every 6 hours** (4x per day)
   - AutoScout24: 1000 listings max per URL
   - mobile.de: 1000 listings max per URL
   - LeBonCoin: 1000 listings max per URL
   - **Estimated cost**: ~€50-100/month
   - **New listings/day**: ~5000-10000

2. **Weekly complete scraping** (1x per week)
   - Sunday morning at 3am
   - No limit (all listings)
   - **Estimated cost**: ~€200-300/month
   - **Result**: Complete up-to-date catalog

3. **Targeted scraping for popular brands** (optional)
   - BMW, Mercedes, Audi: Every 3 hours
   - Other premium brands: Every 6 hours
   - **Estimated cost**: ~€100-200/month

**Total estimated**: €350-600/month for complete coverage

## 🔄 How the System Handles Duplicates

The current system:
1. ✅ **Automatically detects duplicates** via `source_listing_id`
2. ✅ **Updates existing listings** (price, description, images)
3. ✅ **Records price history** if price changes
4. ✅ **Marks as "active"** new listings

**Result**: Even if you scrape the same listings, the system updates them intelligently.

## 💡 Possible Future Optimizations

### 1. Intelligent New Listing Detection
- Use site APIs to retrieve only IDs of new listings
- Scrape only listings with IDs not present in database

### 2. Segment-Based Scraping
- Scrape by price range
- Scrape by region
- Scrape by vehicle type

### 3. Listing Prioritization
- Prioritize scraping listings with many views
- Prioritize scraping recent listings
- Ignore very old listings (>90 days)

## 📈 Example Configuration for 15M Listings

### Realistic Scenario:

**Day 1**: Initial complete scraping
- Scrape all available listings
- Cost: ~€500-1000 (one-time)
- Result: Complete database

**Following days**: Incremental scraping
- 4x per day, 1000 listings per URL
- Cost: ~€50-100/month
- Result: ~5000-10000 new listings/day

**Every Sunday**: Complete scraping
- No limit, all listings
- Cost: ~€200-300/month
- Result: Complete weekly update

**Monthly total**: ~€250-400/month after initial scraping

## 🎯 Final Recommendation

**For Carindex V1, use**:
1. ✅ **Incremental scraping every 6 hours** (by default)
2. ✅ **Weekly complete scraping** (Sunday morning)
3. ✅ **"No limit" option** for priority brands

**Don't scrape everything every day** - it's useless and expensive!
