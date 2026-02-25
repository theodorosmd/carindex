import express from 'express';
import { body, param } from 'express-validator';
import { createAlert, getAlertEvents } from '../controllers/alertsController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const createAlertValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['price_drop', 'new_listing', 'market_movement']).withMessage('Valid type is required'),
  body('criteria').isObject().withMessage('Criteria must be an object'),
  validateRequest
];

router.post('/', createAlertValidation, createAlert);
router.get('/:alertId/events', getAlertEvents);

export const alertsRoutes = router;









