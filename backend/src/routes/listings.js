import express from 'express';
import { query, validationResult } from 'express-validator';
import { searchListings, getListingById, getListingPriceHistory } from '../controllers/listingsController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

const searchValidation = [
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
  validateRequest
];

// Public routes - optional authentication to get user plan for premium features
// IMPORTANT: /search and /:id/price-history must come before /:id to avoid route conflicts
router.get('/search', optionalAuthMiddleware, searchValidation, searchListings);
router.get('/:id/price-history', optionalAuthMiddleware, getListingPriceHistory);
router.get('/:id', optionalAuthMiddleware, getListingById);

export const listingsRoutes = router;


