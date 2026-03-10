import express from 'express';
import { param, query } from 'express-validator';
import {
  getListingPriceHistory,
  getListingPriceDrops,
  getPriceDropsByModel,
  getUndervaluedListings
} from '../controllers/priceHistoryController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const listingIdValidation = [param('id').isUUID().withMessage('id must be a valid UUID'), validateRequest];
const priceHistoryQueryValidation = [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  validateRequest
];
const priceDropsQueryValidation = [
  query('min_drop').optional().isFloat({ min: 0, max: 100 }).withMessage('min_drop must be between 0 and 100'),
  validateRequest
];

// Get price history for a listing
router.get('/listings/:id/price-history', listingIdValidation, priceHistoryQueryValidation, getListingPriceHistory);

// Get price drops for a listing
router.get('/listings/:id/price-drops', listingIdValidation, priceDropsQueryValidation, getListingPriceDrops);

// Get price drops by model
const priceDropsByModelValidation = [
  query('brand').notEmpty().withMessage('Brand is required'),
  query('model').notEmpty().withMessage('Model is required'),
  query('min_drop').optional().isFloat({ min: 0, max: 100 }).withMessage('min_drop must be between 0 and 100'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  validateRequest
];
router.get('/price-drops', priceDropsByModelValidation, getPriceDropsByModel);

// Get undervalued listings (hot deals)
const undervaluedValidation = [
  query('threshold').optional().isFloat({ min: 0, max: 100 }).withMessage('threshold must be between 0 and 100'),
  query('dom_min').optional().isInt({ min: 0 }).withMessage('dom_min must be >= 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  validateRequest
];
router.get('/undervalued-listings', undervaluedValidation, getUndervaluedListings);

export const priceHistoryRoutes = router;
