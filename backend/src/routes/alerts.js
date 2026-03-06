import express from 'express';
import { body, param } from 'express-validator';
import { createAlert, getAlertEvents } from '../controllers/alertsController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware } from '../middleware/auth.js';
import { checkAlertLimit } from '../middleware/planLimits.js';

const router = express.Router();

const createAlertValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['price_drop', 'new_listing', 'market_movement', 'arbitrage', 'fast_model']).withMessage('Valid type is required'),
  body('criteria').isObject().withMessage('Criteria must be an object'),
  validateRequest
];

router.post('/', authMiddleware, checkAlertLimit, createAlertValidation, createAlert);
router.get('/:alertId/events', authMiddleware, getAlertEvents);

export const alertsRoutes = router;









