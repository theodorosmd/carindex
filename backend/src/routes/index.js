import express from 'express';
import { marketPriceRoutes } from './marketPrice.js';
import { listingsRoutes } from './listings.js';
import { trendsRoutes } from './trends.js';
import { stockRoutes } from './stock.js';
import { alertsRoutes } from './alerts.js';
import { facetsRoutes } from './facets.js';
import { favoritesRoutes } from './favorites.js';
import { scraperRoutes } from './scraper.js';
import { authRoutes } from './auth.js';
import { dashboardRoutes } from './dashboard.js';
import { adminRoutes } from './admin.js';
import { marginRoutes } from './margin.js';
import { evaluationsRoutes } from './evaluations.js';
import { franceRoutes } from './france.js';
import { priceHistoryRoutes } from './priceHistory.js';
import { analyticsRoutes } from './analytics.js';
import { arbitrageRoutes } from './arbitrage.js';
import { getAutoDetectedEndpoint } from '../controllers/arbitrageController.js';
import { webhookRoutes } from './webhooks.js';
import { ingestRoutes, ingestPublicRoutes } from './ingest.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

export function setupRoutes(app) {
  // Public routes
  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Config check (for debugging missing vars on Railway)
  app.get('/api/v1/health/config', (req, res) => {
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    res.json({
      status: hasSupabaseUrl && hasSupabaseKey ? 'ok' : 'missing_vars',
      SUPABASE_URL: hasSupabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: hasSupabaseKey
    });
  });

  // Backend identity (for debugging - which server is responding?)
  app.get('/api/v1/health/target', (req, res) => {
    res.json({
      port: process.env.PORT || 3000,
      env: process.env.NODE_ENV || 'development',
      pid: process.pid
    });
  });

  // DB connectivity check (for debugging 500s - development only)
  app.get('/api/v1/health/db', async (req, res) => {
    try {
      const { supabase } = await import('../config/supabase.js');
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (error) {
        return res.status(503).json({
          status: 'db_error',
          error: error.message,
          code: error.code,
          details: error.details
        });
      }
      res.json({ status: 'ok', db: 'connected', usersCount: count });
    } catch (e) {
      res.status(503).json({
        status: 'db_error',
        error: e.message,
        stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
      });
    }
  });

  // Public routes (no auth required)
  app.use('/api/v1/auth', authRoutes); // Authentication routes are public
  app.use('/api/v1/facets', facetsRoutes);
  app.use('/api/v1/listings', listingsRoutes); // Listings search is public
  app.use('/api/v1/france', franceRoutes); // France-specific routes (malus calculation) - public
  app.use('/api/v1', priceHistoryRoutes); // Price history routes (some public, some protected)
  app.use('/api/v1/webhooks', webhookRoutes); // Webhook routes (HMAC auth)
  app.use('/api/v1/ingest/public', ingestPublicRoutes); // Ingest via API key (X-API-Key)

  // Protected API routes
  const apiRouter = express.Router();
  
  // Apply rate limiting to all API routes
  apiRouter.use(rateLimiter);

  // Public: arbitrage auto-detected (no auth) - MUST be before authMiddleware
  const arbitragePublicRouter = express.Router();
  arbitragePublicRouter.get('/auto-detected', getAutoDetectedEndpoint);
  apiRouter.use('/arbitrage', arbitragePublicRouter);

  apiRouter.use(authMiddleware);

  // Protected routes
  apiRouter.use('/market-price', marketPriceRoutes);
  apiRouter.use('/arbitrage', arbitrageRoutes);
  apiRouter.use('/trends', trendsRoutes);
  apiRouter.use('/stock', stockRoutes);
  apiRouter.use('/alerts', alertsRoutes);
  apiRouter.use('/favorites', favoritesRoutes);
  apiRouter.use('/scraper', scraperRoutes);
  apiRouter.use('/dashboard', dashboardRoutes);
  apiRouter.use('/margin', marginRoutes);
  apiRouter.use('/evaluations', evaluationsRoutes);
  apiRouter.use('/analytics', analyticsRoutes); // Market analytics routes
  apiRouter.use('/admin', adminRoutes); // Admin routes (require admin role)
  apiRouter.use('/ingest', ingestRoutes); // Ingestion routes (protected)

  app.use('/api/v1', apiRouter);
}


