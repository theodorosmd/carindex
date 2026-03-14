import express from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import { validateRequest as validate } from '../middleware/validateRequest.js';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  getStripeConfig,
} from '../controllers/subscriptionController.js';

const router = express.Router();

// GET /api/v1/subscription/config — public (publishable key for frontend)
router.get('/config', getStripeConfig);

// All routes below require auth
router.use(authMiddleware);

// GET /api/v1/subscription/status
router.get('/status', getSubscriptionStatus);

// POST /api/v1/subscription/checkout
router.post(
  '/checkout',
  [body('plan').isIn(['pro', 'dealer']).withMessage('Plan must be pro or dealer')],
  validate,
  createCheckoutSession
);

// POST /api/v1/subscription/portal
router.post('/portal', createPortalSession);

export const subscriptionRoutes = router;
