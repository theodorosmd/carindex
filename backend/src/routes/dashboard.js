import express from 'express';
import { getUserStats, getRecentSearches, getUserAlerts } from '../services/dashboardService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Get dashboard statistics
 * GET /api/v1/dashboard/stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;

    logger.info('Dashboard stats request', { userId });

    const stats = await getUserStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error in dashboard stats route', { error: error.message });
    next(error);
  }
});

/**
 * Get recent searches
 * GET /api/v1/dashboard/recent-searches
 */
router.get('/recent-searches', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    logger.info('Recent searches request', { userId, limit });

    const searches = await getRecentSearches(userId, limit);

    res.json({
      success: true,
      searches
    });
  } catch (error) {
    logger.error('Error in recent searches route', { error: error.message });
    next(error);
  }
});

/**
 * Get user alerts
 * GET /api/v1/dashboard/alerts
 */
router.get('/alerts', async (req, res, next) => {
  try {
    const userId = req.user.id;

    logger.info('User alerts request', { userId });

    const alerts = await getUserAlerts(userId);

    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    logger.error('Error in user alerts route', { error: error.message });
    next(error);
  }
});

export const dashboardRoutes = router;







