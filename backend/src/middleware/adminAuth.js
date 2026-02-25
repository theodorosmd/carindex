import { logger } from '../utils/logger.js';

/**
 * Middleware to check if user is admin
 * Must be used after authMiddleware (which is already applied in routes/index.js)
 */
export function requireAdmin(req, res, next) {
  // Check if user is authenticated (authMiddleware should have set req.user)
  if (!req.user) {
    logger.warn('Admin access denied - no user in request');
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  // Check if user is admin
  if (req.user.role !== 'admin') {
    logger.warn('Admin access denied', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role
    });
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
    });
  }

  next();
}

