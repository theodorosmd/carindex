import express from 'express';
import { body } from 'express-validator';
import { requireAdmin } from '../middleware/adminAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { getStats, getScraperDashboard, getUsers, updateRole, updatePlan, exportListingsCsv, getUsersNearLimitsController, refreshListingsStatsCache } from '../controllers/adminController.js';
import {
  getAutoScrapers,
  getAutoScraper,
  createAutoScraperController,
  updateAutoScraperController,
  deleteAutoScraperController,
  runAutoScraperController,
  resetAutoScraperStatusController,
  resumeAutoScraperController
} from '../controllers/autoScraperController.js';

const router = express.Router();

// All admin routes require admin authentication
// Note: authMiddleware is already applied in routes/index.js, so we only need requireAdmin here
router.use(requireAdmin);

/**
 * Get admin dashboard statistics
 * GET /api/v1/admin/stats
 */
router.get('/stats', getStats);

/**
 * Get scraper dashboard (runs, crons, OK/pending/failed per website)
 * GET /api/v1/admin/scraper-dashboard
 */
router.get('/scraper-dashboard', getScraperDashboard);

/**
 * Get all users (paginated)
 * GET /api/v1/admin/users
 */
router.get('/users', getUsers);

/**
 * Get users near their plan limits
 * GET /api/v1/admin/users/near-limits
 */
router.get('/users/near-limits', getUsersNearLimitsController);

/**
 * Update user role
 * PATCH /api/v1/admin/users/:userId/role
 */
const roleValidation = [
  body('role')
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"'),
  validateRequest
];

router.patch('/users/:userId/role', roleValidation, updateRole);

/**
 * Update user plan
 * PATCH /api/v1/admin/users/:userId/plan
 */
const planValidation = [
  body('plan')
    .isIn(['starter', 'pro', 'plus'])
    .withMessage('Plan must be one of: starter, pro, plus'),
  validateRequest
];

router.patch('/users/:userId/plan', planValidation, updatePlan);

/**
 * Export listings (CSV)
 * GET /api/v1/admin/listings/export/csv
 */
router.get('/listings/export/csv', exportListingsCsv);

/**
 * Refresh listing stats cache (call from VPS scraper after each batch)
 * POST /api/v1/admin/listings/stats/refresh
 */
router.post('/listings/stats/refresh', refreshListingsStatsCache);

/**
 * Auto Scrapers routes
 */
router.get('/auto-scrapers', getAutoScrapers);
router.get('/auto-scrapers/:id', getAutoScraper);
router.post('/auto-scrapers', createAutoScraperController);
router.patch('/auto-scrapers/:id', updateAutoScraperController);
router.delete('/auto-scrapers/:id', deleteAutoScraperController);
router.post('/auto-scrapers/:id/run', runAutoScraperController);
router.post('/auto-scrapers/:id/resume', resumeAutoScraperController);
router.post('/auto-scrapers/:id/reset-status', resetAutoScraperStatusController);

export const adminRoutes = router;

