import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Favorites service for managing user favorite listings
 */

export async function addFavorite(userId, listingId) {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        listing_id: listingId
      })
      .select()
      .single();

    if (error) {
      // If duplicate, return existing
      if (error.code === '23505') { // Unique violation
        const { data: existing } = await supabase
          .from('favorites')
          .select()
          .eq('user_id', userId)
          .eq('listing_id', listingId)
          .single();
        return existing;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error adding favorite:', error);
    throw error;
  }
}

export async function removeFavorite(userId, listingId) {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') { // Not found
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error removing favorite:', error);
    throw error;
  }
}

export async function getUserFavorites(userId, limit = 50, offset = 0) {
  try {
    // Get favorites with joined listings
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select(`
        *,
        listings (*)
      `)
      .eq('user_id', userId)
      .eq('listings.status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (favoritesError) {
      throw favoritesError;
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      throw countError;
    }

    // Flatten the response to match expected format
    const favoritesWithListings = (favorites || []).map(fav => ({
      ...fav,
      ...fav.listings
    }));

    return {
      favorites: favoritesWithListings,
      total: count || 0,
      limit,
      offset
    };
  } catch (error) {
    logger.error('Error getting user favorites:', error);
    throw error;
  }
}

export async function isFavorite(userId, listingId) {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // Not found
      logger.error('Error checking favorite:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error checking favorite:', error);
    return false;
  }
}

export async function getFavoriteStatuses(userId, listingIds) {
  try {
    if (!listingIds || listingIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .in('listing_id', listingIds);

    if (error) {
      throw error;
    }

    const favoriteIds = new Set((data || []).map(row => row.listing_id));

    const statuses = {};
    listingIds.forEach(id => {
      statuses[id] = favoriteIds.has(id);
    });

    return statuses;
  } catch (error) {
    logger.error('Error getting favorite statuses:', error);
    return {};
  }
}
