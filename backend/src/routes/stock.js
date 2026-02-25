import express from 'express';
import { body } from 'express-validator';
import { analyzeStock } from '../controllers/stockController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const stockValidation = [
  body('vehicles').isArray().withMessage('Vehicles must be an array'),
  body('vehicles.*.id').notEmpty().withMessage('Vehicle ID is required'),
  body('vehicles.*.brand').notEmpty().withMessage('Brand is required'),
  body('vehicles.*.model').notEmpty().withMessage('Model is required'),
  body('vehicles.*.year').isInt({ min: 1990 }).withMessage('Valid year is required'),
  body('vehicles.*.mileage').isInt({ min: 0 }).withMessage('Valid mileage is required'),
  body('vehicles.*.asking_price').isFloat({ min: 0 }).withMessage('Valid asking price is required'),
  body('vehicles.*.country').optional().isLength({ min: 2, max: 2 }),
  validateRequest
];

router.post('/analyze', stockValidation, analyzeStock);

export const stockRoutes = router;









