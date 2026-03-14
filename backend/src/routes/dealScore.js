import express from 'express';
import { query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { getDealScore } from '../controllers/dealScoreController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Stricter rate limit for the public deal score endpoint
// 30 unique lookups per IP per hour — generous for real use, limits scrapers
const dealScoreLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => req.ip,
  skip: (req) => !!req.headers.authorization, // authenticated users skip rate limit
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many deal score requests. Please sign in for unlimited access.',
      upgrade_url: '/signup',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const dealScoreValidation = [
  query('brand').notEmpty().withMessage('brand is required'),
  query('model').notEmpty().withMessage('model is required'),
  query('year')
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage('Valid year required (1990–present)'),
  query('mileage').optional().isInt({ min: 0 }).withMessage('mileage must be >= 0'),
  query('country').optional().isLength({ min: 2, max: 2 }).withMessage('country must be 2-letter ISO code'),
  query('fuel_type').optional().isIn(['diesel', 'petrol', 'electric', 'hybrid', 'lpg', 'cng']),
  query('transmission').optional().isIn(['manual', 'automatic']),
  query('price').optional().isFloat({ min: 100 }).withMessage('price must be a positive number'),
  validateRequest,
];

// Public endpoint — no auth required, IP rate-limited
router.get('/', dealScoreLimiter, dealScoreValidation, getDealScore);

export const dealScoreRoutes = router;
