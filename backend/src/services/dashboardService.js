import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { PLAN_LIMITS, getPlanLimits } from '../middleware/planLimits.js';

/**
 * Get user statistics
 */
export async function getUserStats(userId) {
  try {
    // Get user plan
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    const plan = user.plan || 'starter';
    const limits = getPlanLimits(plan);

    // Count searches this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: searchesCount, error: searchesError } = await supabase
      .from('user_searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (searchesError) {
      logger.warn('Error counting user searches', { error: searchesError.message, userId });
    }

    // Count active alerts
    const { count: alertsCount, error: alertsError } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (alertsError) {
      logger.warn('Error counting user alerts', { error: alertsError.message, userId });
    }

    return {
      plan,
      searches: {
        count: searchesCount || 0,
        limit: limits.searches_per_month,
        remaining: limits.searches_per_month === -1 ? -1 : Math.max(0, limits.searches_per_month - (searchesCount || 0))
      },
      alerts: {
        count: alertsCount || 0,
        limit: limits.alerts_active,
        remaining: limits.alerts_active === -1 ? -1 : Math.max(0, limits.alerts_active - (alertsCount || 0))
      }
    };
  } catch (error) {
    logger.error('Error getting user stats', { error: error.message, userId });
    throw error;
  }
}

/**
 * Get recent searches for user
 */
export async function getRecentSearches(userId, limit = 5) {
  try {
    const { data, error } = await supabase
      .from('user_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error getting recent searches', { error: error.message, userId });
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getRecentSearches', { error: error.message, userId });
    throw error;
  }
}

/**
 * Get user alerts
 */
export async function getUserAlerts(userId) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting user alerts', { error: error.message, userId });
      throw error;
    }

    // Get event counts for each alert
    const alertsWithCounts = await Promise.all(
      (data || []).map(async (alert) => {
        const { count, error: countError } = await supabase
          .from('alert_events')
          .select('*', { count: 'exact', head: true })
          .eq('alert_id', alert.id);

        return {
          ...alert,
          events_count: countError ? 0 : (count || 0)
        };
      })
    );

    return alertsWithCounts;
  } catch (error) {
    logger.error('Error in getUserAlerts', { error: error.message, userId });
    throw error;
  }
}

/**
 * Save a user search
 */
export async function saveUserSearch(userId, searchCriteria, resultsCount) {
  try {
    const { data, error } = await supabase
      .from('user_searches')
      .insert({
        user_id: userId,
        search_criteria: searchCriteria,
        results_count: resultsCount
      })
      .select()
      .single();

    if (error) {
      logger.error('Error saving user search', { error: error.message, userId });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in saveUserSearch', { error: error.message, userId });
    throw error;
  }
}







