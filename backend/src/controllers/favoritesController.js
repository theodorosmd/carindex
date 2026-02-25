import {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorite,
  getFavoriteStatuses
} from '../services/favoritesService.js';
import { logger } from '../utils/logger.js';

export async function toggleFavorite(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { listingId } = req.body;
    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    // Check if already favorite
    const favorite = await isFavorite(userId, listingId);
    
    if (favorite) {
      await removeFavorite(userId, listingId);
      res.json({ is_favorite: false, message: 'Favorite removed' });
    } else {
      await addFavorite(userId, listingId);
      res.json({ is_favorite: true, message: 'Favorite added' });
    }
  } catch (error) {
    logger.error('Error toggling favorite:', error);
    next(error);
  }
}

export async function getFavorites(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await getUserFavorites(userId, limit, offset);
    res.json(result);
  } catch (error) {
    logger.error('Error getting favorites:', error);
    next(error);
  }
}

export async function checkFavoriteStatus(req, res, next) {
  try {
    const userId = req.user?.id;
    const { listingIds } = req.body;

    if (!listingIds || !Array.isArray(listingIds)) {
      return res.status(400).json({ error: 'listingIds array is required' });
    }

    const statuses = userId 
      ? await getFavoriteStatuses(userId, listingIds)
      : {};
    
    res.json({ statuses });
  } catch (error) {
    logger.error('Error checking favorite status:', error);
    next(error);
  }
}








