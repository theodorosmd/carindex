import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { getMarketPrice } from '../controllers/marketPriceController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const marketPriceValidation = [
  query('brand').notEmpty().withMessage('Brand is required'),
  query('model').notEmpty().withMessage('Model is required'),
  query('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
  query('mileage').isInt({ min: 0 }).withMessage('Valid mileage is required'),
  query('country').optional().isLength({ min: 2, max: 2 }).withMessage('Country must be 2 characters'),
  query('fuel_type').optional().isIn(['diesel', 'petrol', 'electric', 'hybrid']),
  query('transmission').optional().isIn(['manual', 'automatic']),
  validateRequest
];

router.get('/', marketPriceValidation, getMarketPrice);

export const marketPriceRoutes = router;









