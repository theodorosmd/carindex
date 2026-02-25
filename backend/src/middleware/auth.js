import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

/**
 * Authentication middleware - verifies JWT token and adds user to request
 * Does not check plan restrictions (use optionalAuthMiddleware for that)
 */
export function authMiddleware(req, res, next) {
  console.log('=== authMiddleware CALLED ===', { path: req.path, method: req.method });
  try {
    logger.info('authMiddleware called', { path: req.path, method: req.method });
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('=== NO AUTH HEADER ===');
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header'
        }
      });
    }

    const token = authHeader.substring(7);
    console.log('=== VERIFYING TOKEN ===', { tokenLength: token.length });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('=== TOKEN VERIFIED ===', { userId: decoded.userId });
    } catch (jwtError) {
      console.error('=== JWT VERIFY ERROR ===', jwtError);
      throw jwtError;
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      plan: decoded.plan,
      role: decoded.role || 'user'
    };

    console.log('=== AUTHENTICATION SUCCESSFUL ===', { userId: req.user.id });
    logger.info('Authentication successful', { userId: req.user.id, path: req.path });
    next();
  } catch (error) {
    console.error('=== AUTHENTICATION ERROR ===', error);
    logger.warn('Authentication failed', { error: error.message });
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
 * Middleware to check if user has specific plan
 */
export function requirePlan(...allowedPlans) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedPlans.includes(req.user.plan)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`
        }
      });
    }

    next();
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



