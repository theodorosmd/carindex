import express from 'express';
import {
  toggleFavorite,
  getFavorites,
  checkFavoriteStatus
} from '../controllers/favoritesController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Toggle favorite (add/remove)
router.post('/toggle', authMiddleware, toggleFavorite);

// Get user's favorites
router.get('/', authMiddleware, getFavorites);

// Check favorite status for multiple listings (public endpoint)
router.post('/status', checkFavoriteStatus);

export const favoritesRoutes = router;


