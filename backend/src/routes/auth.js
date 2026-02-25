import express from 'express';
import { body, validationResult } from 'express-validator';
import { registerUser, loginUser, getUserById } from '../services/authService.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validateRequest
];

router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info('Registration request', { email });

    const result = await registerUser(email, password);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...result
    });
  } catch (error) {
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists'
        }
      });
    }

    logger.error('Error in register route', { error: error.message });
    next(error);
  }
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest
];

router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info('Login request', { email });

    const result = await loginUser(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    logger.error('Error in login route', { error: error.message });
    next(error);
  }
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Error in /me route', { error: error.message });
    next(error);
  }
});

/**
 * Logout (client-side only, but endpoint for consistency)
 * POST /api/v1/auth/logout
 */
router.post('/logout', authMiddleware, async (req, res) => {
  // JWT is stateless, so logout is handled client-side by removing token
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

export const authRoutes = router;







