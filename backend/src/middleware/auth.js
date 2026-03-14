import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { supabase } from '../config/supabase.js';

const DEFAULT_SECRET = 'your-secret-key-change-in-production';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret === DEFAULT_SECRET)) {
    throw new Error('JWT_SECRET must be set in production. Do not use the default value.');
  }
  return secret;
}

// Fail fast in production on startup
if (process.env.NODE_ENV === 'production') {
  getJwtSecret();
}

/**
 * Authentication middleware - verifies JWT token and adds user to request
 * Does not check plan restrictions (use optionalAuthMiddleware for that)
 */
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header'
        }
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret());

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      plan: decoded.plan,
      role: decoded.role || 'user'
    };

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message, path: req.path });
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }
}

/**
 * Optional authentication middleware - adds user if token present, but doesn't require it
 */
export function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          plan: decoded.plan,
          role: decoded.role || 'user'
        };
      } catch (error) {
        // Invalid token, but continue without user
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // Continue without user on error
    req.user = null;
    next();
  }
}

/**
 * Middleware to check if user has specific plan.
 * Reads plan LIVE from DB so Stripe webhook updates take effect immediately
 * without requiring the user to log out and back in.
 */
export function requirePlan(...allowedPlans) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    try {
      // Use cached live plan if already looked up in this request
      let livePlan = req.user.livePlan;
      if (!livePlan) {
        const { data } = await supabase
          .from('users')
          .select('plan')
          .eq('id', req.user.id)
          .single();
        livePlan = data?.plan ?? 'starter';
        req.user.livePlan = livePlan; // cache for subsequent requirePlan calls in same request
      }

      if (!allowedPlans.includes(livePlan)) {
        return res.status(403).json({
          error: {
            code: 'PLAN_REQUIRED',
            message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`,
            currentPlan: livePlan,
            requiredPlans: allowedPlans,
          }
        });
      }

      next();
    } catch (err) {
      logger.warn('requirePlan: DB lookup failed, falling back to JWT plan', { error: err.message });
      // Fallback to JWT plan if DB lookup fails
      if (!allowedPlans.includes(req.user.plan ?? 'starter')) {
        return res.status(403).json({
          error: {
            code: 'PLAN_REQUIRED',
            message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`,
          }
        });
      }
      next();
    }
  };
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
    });
  }

  next();
}



