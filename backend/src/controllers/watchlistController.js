import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getSalesStats } from '../services/saleDetector.js';
import { calculateSalesVelocity, getMedianSalePrice, getTopSellingModels } from '../services/velocityCalculator.js';

/**
 * Add model to watchlist
 */
export async function addToWatchlist(req, res) {
  try {
    const { brand, model, year = null, notes = null } = req.body;
    const userId = req.user.id;

    if (!brand || !model) {
      return res.status(400).json({
        success: false,
        error: 'Brand and model are required'
      });
    }

    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: userId,
        brand,
        model,
        year: year ? parseInt(year) : null,
        notes: notes || null,
        notification_enabled: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'Ce modèle est déjà dans votre watchlist'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      watchlistItem: data
    });
  } catch (error) {
    logger.error('Error adding to watchlist', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get user watchlist
 */
export async function getWatchlist(req, res) {
  try {
    const userId = req.user.id;

    const { data: watchlist, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Enrich with current stats
    const enrichedWatchlist = await Promise.all(
      (watchlist || []).map(async (item) => {
        try {
          const stats = await getSalesStats(item.brand, item.model, item.year);
          const velocity = await calculateSalesVelocity(item.brand, item.model, 30);
          const medianPrice = await getMedianSalePrice(item.brand, item.model, item.year);

          // Get current rank in fastest selling
          const topModels = await getTopSellingModels(100, 30);
          const rank = topModels.findIndex(m => 
            m.brand.toLowerCase() === item.brand.toLowerCase() &&
            m.model.toLowerCase() === item.model.toLowerCase() &&
            (item.year ? m.year === item.year : true)
          ) + 1; // +1 because index is 0-based

          return {
            ...item,
            currentStats: {
              averageDOM: stats.averageDOM,
              totalSales: stats.totalSales,
              velocityPerMonth: velocity.velocityPerMonth,
              medianPrice: medianPrice.medianPrice,
              currentRank: rank > 0 ? rank : null
            }
          };
        } catch (err) {
          logger.warn('Error enriching watchlist item', { error: err.message, item });
          return {
            ...item,
            currentStats: null
          };
        }
      })
    );

    res.json({
      success: true,
      watchlist: enrichedWatchlist,
      count: enrichedWatchlist.length
    });
  } catch (error) {
    logger.error('Error getting watchlist', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Modèle retiré de la watchlist'
    });
  } catch (error) {
    logger.error('Error removing from watchlist', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get watchlist history
 */
export async function getWatchlistHistory(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify watchlist item belongs to user
    const { data: watchlistItem, error: checkError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !watchlistItem) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist item not found'
      });
    }

    const { data: history, error } = await supabase
      .from('watchlist_history')
      .select('*')
      .eq('watchlist_id', id)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      history: history || [],
      count: history?.length || 0
    });
  } catch (error) {
    logger.error('Error getting watchlist history', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
