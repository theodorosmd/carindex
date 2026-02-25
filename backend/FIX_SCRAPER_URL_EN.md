# 🔧 Fix BMW Scraper URL

## Problem
The "Autoscout BMW Bis" scraper only retrieves **222 listings** while AutoScout24 displays **160,235** for BMW.

## Cause
The search URL is too restrictive with multiple filters that limit results:
- `search_id=2deu8na73ft` (specific search ID)
- `powertype=kw` (power filter)
- `cy=D%2CA%2CB%2CE%2CF%2CI%2CL%2CNL` (specific countries)
- `damaged_listing=exclude`

## Solution

### Option 1: Simple URL (recommended)
Use a minimal URL that captures all BMWs:

```
https://www.autoscout24.fr/lst/bmw
```

or

```
https://www.autoscout24.fr/lst?make=BMW
```

### Option 2: URL with standard sort only
If you want to keep consistent sorting:

```
https://www.autoscout24.fr/lst/bmw?sort=standard&desc=0
```

### Option 3: URL with European countries (if necessary)
If you want to limit to Europe but without other filters:

```
https://www.autoscout24.fr/lst/bmw?cy=D%2CA%2CB%2CE%2CF%2CI%2CL%2CNL&sort=standard
```

## Action to Take

1. **Go to Admin Dashboard** (`#/admin`)
2. **Find scraper "Autoscout BMW Bis"**
3. **Click "Edit"**
4. **Replace current URL** with one of the URLs above (Option 1 recommended)
5. **Save**
6. **Relaunch scraper** with "Run"

## Verification

After modification, the scraper should retrieve many more listings (potentially several thousand, or tens of thousands depending on the Apify actor limit).

**Note**: The Puppeteer scraper may be limited by the number of pages crawled.
