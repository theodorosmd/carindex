import express from 'express';
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
  getRecentSalesMonitoring
} from '../controllers/priceHistoryController.js';

const router = express.Router();

// Get filter options (brands, countries, years) for Market Insights
router.get('/filter-options', getFilterOptions);

// Get fastest selling models (models that sell the quickest)
router.get('/fastest-selling-models', getFastestSellingModels);

// Get statistics by country (for comparative charts)
router.get('/stats-by-country', getStatsByCountry);

// Export fastest selling models (CSV/JSON)
router.get('/export', exportFastestSellingModels);

// Compare multiple models
router.post('/compare-models', compareModels);

// Get trends over time for a model
router.get('/trends', getModelTrends);

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
router.delete('/watchlist/:id', removeFromWatchlist);
router.get('/watchlist/:id/history', getWatchlistHistory);

// Get predictions (ML-based heuristics)
router.get('/predictions', getPredictions);

// Get recent sales monitoring (last 30 days - what sold fastest and at what price)
router.get('/recent-sales', getRecentSalesMonitoring);

// Export as PDF (returns JSON structure for PDF generation)
router.get('/export-pdf', exportAsPDF);

// Get market analytics (top selling models, conversion rates, etc.)
router.get('/market-analytics', getMarketAnalytics);

export const analyticsRoutes = router;
