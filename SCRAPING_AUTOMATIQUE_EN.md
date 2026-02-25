# 🔄 Automatic Scraping System

## Overview

The automatic scraping system allows you to configure scrapings that run automatically according to a defined schedule (Cron format).

## Installation

### 1. Create the table in Supabase

Run the following SQL in Supabase SQL Editor:

```sql
-- Table to store automatic scraping configurations
CREATE TABLE IF NOT EXISTS auto_scrapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin')),
  name VARCHAR(255) NOT NULL,
  search_urls TEXT[] NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20),
  last_run_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_scrapers_source ON auto_scrapers(source);
CREATE INDEX IF NOT EXISTS idx_auto_scrapers_enabled ON auto_scrapers(enabled) WHERE enabled = true;
```

### 2. Enable automatic scrapings

Make sure the `ENABLE_AUTO_SCRAPERS` environment variable is not set to `false` in `.env`:

```env
ENABLE_AUTO_SCRAPERS=true
```

## Usage from Admin Dashboard

### Create an automatic scraping

1. Go to the **Admin Dashboard** (`#/admin`)
2. Scroll down to the **"Automatic scrapings"** section
3. Click on **"+ New automatic scraping"**
4. Fill out the form:
   - **Name**: A descriptive name (ex: "AutoScout24 - Used cars")
   - **Source**: AutoScout24, mobile.de, or LeBonCoin
   - **Search URLs**: One URL per line (you can put multiple to scrape several searches in one execution)
   - **Schedule**: Cron format (ex: `0 */6 * * *` for every 6 hours)
   - **Enable**: Check to activate immediately

### ⚡ Automatic scraping by pagination

**Good news!** You don't need to know all the URLs. Apify scrapers automatically browse **all pages** of a search!

**How it works:**
1. You provide **a single search URL** (ex: `https://www.autoscout24.fr/lst?make=BMW`)
2. The scraper automatically browses **all pages** of this search
3. You can limit the number of listings with `max_results` (default: 1000)

**Simple example:**
```
URL: https://www.autoscout24.fr/lst?make=BMW
Max results: 1000
```
→ The scraper will automatically browse all pages until it finds 1000 BMW listings (or until the end if there are fewer).

### Why multiple URLs then?

You can put **multiple URLs** (one per line) to:
- ✅ **Scrape different searches**: For example, multiple brands (BMW, Mercedes, Audi) with the same schedule
- ✅ **Save resources**: One Cron job instead of several
- ✅ **Organize by theme**: Group similar searches

**Example with multiple URLs:**
```
https://www.autoscout24.fr/lst?make=BMW
https://www.autoscout24.fr/lst?make=MERCEDES
https://www.autoscout24.fr/lst?make=AUDI
```

Each URL will be scraped with all its pages automatically.

### Common Cron formats

- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Every day at midnight
- `0 0 * * 0` - Every Sunday at midnight
- `0 0 1 * *` - First of each month at midnight
- `0 0,12 * * *` - Every day at noon and midnight

**Format**: `minute hour day month day-of-week`

### Manage automatic scrapings

- **Run now**: Click "Run" to launch a scraping immediately
- **Edit**: Click "Edit" to change the configuration
- **Delete**: Click "Delete" to delete an automatic scraping
- **Enable/Disable**: Edit the scraping and check/uncheck "Enable"

## API Endpoints

### GET /api/v1/admin/auto-scrapers
List all automatic scrapings

### GET /api/v1/admin/auto-scrapers/:id
Get an automatic scraping by ID

### POST /api/v1/admin/auto-scrapers
Create a new automatic scraping

**Body:**
```json
{
  "source": "autoscout24",
  "name": "AutoScout24 - Used cars",
  "search_urls": ["https://www.autoscout24.fr/lst?..."],
  "schedule_cron": "0 */6 * * *",
  "enabled": true
}
```

### PATCH /api/v1/admin/auto-scrapers/:id
Update an automatic scraping

### DELETE /api/v1/admin/auto-scrapers/:id
Delete an automatic scraping

### POST /api/v1/admin/auto-scrapers/:id/run
Run an automatic scraping immediately

## Technical Functioning

1. **On server startup**: Enabled automatic scrapings are loaded and scheduled
2. **According to Cron schedule**: Each scraping runs automatically
3. **Results**: Results are stored in `last_run_result` and `last_run_at` is updated
4. **Reload**: Configurations are reloaded every hour to detect changes

## Monitoring

- Server logs indicate when an automatic scraping is executed
- Admin dashboard displays the status of the last execution
- Errors are recorded in `last_run_result.error`

## Configuration Examples

### AutoScout24 - Every 6 hours
```json
{
  "source": "autoscout24",
  "name": "AutoScout24 - Used cars",
  "search_urls": ["https://www.autoscout24.fr/lst?sort=standard&desc=0"],
  "schedule_cron": "0 */6 * * *",
  "enabled": true
}
```

### mobile.de - Every day at midnight
```json
{
  "source": "mobile.de",
  "name": "mobile.de - New cars",
  "search_urls": ["https://www.mobile.de/fahrzeuge/search.html"],
  "schedule_cron": "0 0 * * *",
  "enabled": true
}
```

### LeBonCoin - Every Sunday
```json
{
  "source": "leboncoin",
  "name": "LeBonCoin - Cars",
  "search_urls": ["https://www.leboncoin.fr/recherche?text=voiture"],
  "schedule_cron": "0 0 * * 0",
  "enabled": true
}
```
