import express from 'express';
import { query } from 'express-validator';
import { getTrends } from '../controllers/trendsController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const trendsValidation = [
  query('brand').notEmpty().withMessage('Brand is required'),
  query('model').notEmpty().withMessage('Model is required'),
  query('country').optional().isLength({ min: 2, max: 2 }),
  query('period').optional().isIn(['30d', '90d', '6m', '12m', '30m']),
  validateRequest
];

router.get('/', trendsValidation, getTrends);

export const trendsRoutes = router;

