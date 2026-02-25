# Update Steering Field (LHD/RHD)

This guide explains how to update existing listings with steering values and how to relaunch scraping so new listings include this information.

## Option 1: Update Existing Listings

A script has been created to automatically update existing listings with a steering value based on their country:

- **RHD** (Right-Hand Drive): GB, UK, IE, MT, CY
- **LHD** (Left-Hand Drive): All other European countries

### Run the Script

```bash
cd backend
node src/scripts/update-steering.js
```

The script will:
1. Find all listings without a steering value
2. Determine the appropriate value based on country
3. Update listings in batches of 500

### Expected Result

After execution, you should see:
```
✅ Update completed: { updated: X }
```

Where X is the number of listings updated.

## Option 2: Relaunch Scraping

New scraped listings will automatically include the steering field thanks to modifications made to the AutoScout24 scraper.

### From Admin Interface

1. Log in as admin
2. Go to the "Admin" section of the dashboard
3. In the "Automatic scrapers" section, you can:
   - View configured scrapers
   - Click "Run" to relaunch an existing scraper
   - Create a new scraper with a search URL

### From API

You can also trigger scraping via the API:

```bash
# Run an existing scraper
curl -X POST http://localhost:3001/api/v1/admin/auto-scrapers/{scraperId}/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### New Complete Scraping

To do a complete scraping that includes steering:

1. **Via admin dashboard**:
   - Create a new scraper or use an existing one
   - Configure it with "Unlimited" to scrape all listings
   - Run it

2. **New listings** will automatically have:
   - Steering extracted from AutoScout24 data if available
   - Otherwise, a default value based on country (LHD for most, RHD for UK/IE)

## Verification

After updating listings or relaunching scraping:

1. Reload the search page
2. The "LEFT-HAND DRIVE" and "RIGHT-HAND DRIVE" counters should now show values > 0
3. You can filter by steering and see corresponding results

## Notes

- Listings already scraped before this update won't have steering unless you run the update script
- New scraped listings will automatically include steering
- The update script can be run multiple times without issue (it only updates listings without steering)
