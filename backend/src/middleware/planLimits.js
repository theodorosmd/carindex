import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export const PLAN_LIMITS = {
  starter: {
    searches_per_month: 200,
    alerts_active: 10
  },
  pro: {
    searches_per_month: -1,
    alerts_active: 50
  },
  plus: {
    searches_per_month: -1,
    alerts_active: -1
  }
};

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

/**
 * Middleware: block the request if the authenticated user has reached their
 * monthly search quota. No-op for unauthenticated requests (public searches).
 */
export async function checkSearchLimit(req, res, next) {
  if (!req.user) return next();

  const { id: userId, plan = 'starter' } = req.user;
  const limits = getPlanLimits(plan);

  if (limits.searches_per_month === -1) return next();

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('user_searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      logger.warn('checkSearchLimit: error counting searches', { error: error.message, userId });
      return next();
    }

    if (count >= limits.searches_per_month) {
      return res.status(429).json({
        error: {
          code: 'SEARCH_LIMIT_REACHED',
          message: `You have reached your ${plan} plan limit of ${limits.searches_per_month} searches this month. Upgrade to continue searching.`,
          limit: limits.searches_per_month,
          used: count,
          plan
        }
      });
    }

    next();
  } catch (err) {
    logger.warn('checkSearchLimit: unexpected error', { error: err.message, userId });
    next();
  }
}

/**
 * Middleware: block the request if the authenticated user has reached their
 * active alert quota. Requires authMiddleware to have run first.
 */
export async function checkAlertLimit(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id: userId, plan = 'starter' } = req.user;
  const limits = getPlanLimits(plan);

  if (limits.alerts_active === -1) return next();

  try {
    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      logger.warn('checkAlertLimit: error counting alerts', { error: error.message, userId });
      return next();
    }

    if (count >= limits.alerts_active) {
      return res.status(429).json({
        error: {
          code: 'ALERT_LIMIT_REACHED',
          message: `You have reached your ${plan} plan limit of ${limits.alerts_active} active alerts. Upgrade to create more alerts.`,
          limit: limits.alerts_active,
          used: count,
          plan
        }
      });
    }

    next();
  } catch (err) {
    logger.warn('checkAlertLimit: unexpected error', { error: err.message, userId });
    next();
  }
}
