# Carindex - Getting Started Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis (optional, for queues)
- Docker & Docker Compose (for monitoring)

## Installation

### 1. Backend API

```bash
cd backend
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

The API server starts on `http://localhost:3001`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:3000`

### 3. Database

```bash
# Create the database
createdb carindex

# Run the schema
psql carindex < backend/src/database/schema.sql
```

### 4. Apify Configuration

1. Create an account on [Apify](https://apify.com)
2. Create a new Actor from `apify/actors/autoscout24-scraper`
3. Configure schedules according to `APIFY_SETUP.md`
4. Add your Apify token in `.env`:
   ```
   APIFY_API_TOKEN=your_token_here
   ```

### 5. Monitoring

```bash
cd monitoring
docker-compose up -d
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## Project Structure

```
carindex/
├── frontend/          # Marketing site (Vite + Tailwind)
├── backend/           # REST API (Express.js)
├── apify/             # Apify actors for scraping
├── monitoring/        # Prometheus + Grafana
└── docs/              # Documentation
```

## Environment Variables

See `CONFIGURATION.md` for the complete list of variables.

## Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## Deployment

### Production

1. Configure environment variables
2. Build the frontend: `cd frontend && npm run build`
3. Deploy the backend (Heroku, AWS, etc.)
4. Configure monitoring
5. Activate Apify schedules

## Support

- Documentation: See `.md` files at root
- Email: tech@carindex.com
