import express from 'express';
import { param, query } from 'express-validator';
import { 
  getMarketAnalytics, 
  getFastestSellingModels, 
  getFilterOptions,
  getStatsByCountry,
  exportFastestSellingModels,
  compareModels,
  getModelTrends,
  getProfitabilityAnalysis,
  createFastModelAlert,
  getRecommendations,
  getCompetitionAnalysis
} from '../controllers/priceHistoryController.js';
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  getWatchlistHistory
} from '../controllers/watchlistController.js';
import {
  getPredictions,
  exportAsPDF,
  getRecentSalesMonitoring,
  getSalesAggregatesEndpoint
} from '../controllers/priceHistoryController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const watchlistIdValidation = [param('id').isUUID().withMessage('id must be a valid UUID'), validateRequest];
const commonQueryValidation = [
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500'),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be >= 0'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('days must be between 1 and 365'),
  validateRequest
];

// Get filter options (brands, countries, years) for Market Insights
router.get('/filter-options', getFilterOptions);

// Get fastest selling models (models that sell the quickest)
const fastestSellingValidation = [
  query('limit').optional().isInt({ min: 1, max: 500 }),
  query('days').optional().isInt({ min: 1, max: 365 }),
  query('brand').optional().notEmpty(),
  query('country').optional().isLength({ min: 2, max: 2 }),
  query('year').optional().isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  validateRequest
];
router.get('/fastest-selling-models', fastestSellingValidation, getFastestSellingModels);

// Get statistics by country (for comparative charts)
const statsByCountryValidation = [
  query('limit').optional().isInt({ min: 1, max: 500 }),
  query('days').optional().isInt({ min: 1, max: 365 }),
  query('brand').optional().notEmpty(),
  query('country').optional().isLength({ min: 2, max: 2 }),
  query('year').optional().isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  query('format').optional().isIn(['csv', 'json']),
  validateRequest
];
router.get('/stats-by-country', statsByCountryValidation, getStatsByCountry);

// Export fastest selling models (CSV/JSON)
router.get('/export', exportFastestSellingModels);

// Compare multiple models
router.post('/compare-models', compareModels);

// Get trends over time for a model
const trendsValidation = [
  query('brand').notEmpty().withMessage('Brand is required'),
  query('model').notEmpty().withMessage('Model is required'),
  query('year').optional().notEmpty(),
  query('months').optional().isInt({ min: 1, max: 60 }),
  validateRequest
];
router.get('/trends', trendsValidation, getModelTrends);

// Get profitability analysis
router.get('/profitability', getProfitabilityAnalysis);

// Get intelligent recommendations
router.get('/recommendations', getRecommendations);

// Get competition analysis
router.get('/competition', getCompetitionAnalysis);

// Create alert for fast-selling models
router.post('/alerts/fast-model', createFastModelAlert);

// Watchlist endpoints
router.post('/watchlist', addToWatchlist);
router.get('/watchlist', getWatchlist);
router.delete('/watchlist/:id', watchlistIdValidation, removeFromWatchlist);
router.get('/watchlist/:id/history', watchlistIdValidation, getWatchlistHistory);

// Get predictions (ML-based heuristics)
router.get('/predictions', getPredictions);

// Get recent sales monitoring (last 30 days - what sold fastest and at what price)
router.get('/recent-sales', getRecentSalesMonitoring);

// Get accumulated sales averages per country (DOM moyen, prix moyen)
router.get('/sales-aggregates', getSalesAggregatesEndpoint);

// Export as PDF (returns JSON structure for PDF generation)
router.get('/export-pdf', exportAsPDF);

// Get market analytics (top selling models, conversion rates, etc.)
router.get('/market-analytics', getMarketAnalytics);

export const analyticsRoutes = router;
