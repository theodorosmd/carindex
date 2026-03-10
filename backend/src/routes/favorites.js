import express from 'express';
import { query } from 'express-validator';
import {
  toggleFavorite,
  getFavorites,
  checkFavoriteStatus
} from '../controllers/favoritesController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Toggle favorite (add/remove)
router.post('/toggle', authMiddleware, toggleFavorite);

// Get user's favorites
const getFavoritesValidation = [
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
  validateRequest
];
router.get('/', authMiddleware, getFavoritesValidation, getFavorites);

// Check favorite status for multiple listings (public endpoint)
router.post('/status', checkFavoriteStatus);

export const favoritesRoutes = router;


