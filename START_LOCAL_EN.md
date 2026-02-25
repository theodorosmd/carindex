# 🚀 Start Carindex Locally

## ✅ Servers Started

Backend and frontend servers are starting up.

## 🌐 Access URLs

### Frontend (User Interface)
**URL**: http://localhost:5173

- **Landing Page**: http://localhost:5173/
- **Search Page**: http://localhost:5173/#/search

### Backend (API)
**URL**: http://localhost:3001

- **Health Check**: http://localhost:3001/health
- **Listings API**: http://localhost:3001/api/v1/listings
- **Scraper API**: http://localhost:3001/api/v1/scraper/run

## 📋 Commands to Start Manually

If servers are not already started:

### Backend
```bash
cd backend
npm run dev
```

### Frontend (in another terminal)
```bash
cd frontend
npm run dev
```

## 🧪 Test the Application

### 1. Open Frontend
Open your browser and go to: **http://localhost:5173**

### 2. Test Landing Page
- You should see the Carindex homepage
- Click "Search" to go to search page

### 3. Test Search
- Go to: http://localhost:5173/#/search
- Scraped listings (10 listings) should appear
- Test search filters

### 4. Test Backend API
```bash
# Health check
curl http://localhost:3001/health

# Get listings
curl http://localhost:3001/api/v1/listings?limit=5
```

## 🔧 Configuration

### Environment Variables

**Backend** (`backend/.env`):
- `PORT=3001`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `APIFY_API_TOKEN` ✅
- `FRONTEND_URL=http://localhost:5173`

**Frontend** (`frontend/.env` or `vite.config.js`):
- Backend API URL is configured in frontend code

## 📊 Available Data

After scraper test, you have **10 listings** in Supabase that should be visible in the search interface.

## 🐛 Troubleshooting

### Frontend doesn't load
- Check that Vite is started: `cd frontend && npm run dev`
- Check port 5173 is not in use

### Backend doesn't respond
- Check that server is started: `cd backend && npm run dev`
- Check port 3001 is not in use
- Check environment variables in `backend/.env`

### No data in search
- Check that listings are in Supabase
- Check Supabase connection: `node backend/src/scripts/test-supabase-api.js`
- Check backend logs for errors

## 🎯 Next Steps

1. ✅ **Application launched locally**
2. ⏭️ **Test search with 10 listings**
3. ⏭️ **Test filters**
4. ⏭️ **Scrape more data** to have more results
5. ⏭️ **Test all features**
