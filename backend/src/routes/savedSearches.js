import express from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  listSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
} from '../controllers/savedSearchesController.js';

const router = express.Router();

const createValidation = [
  body('name').notEmpty().trim().isLength({ max: 200 }).withMessage('name required (max 200 chars)'),
  body('filters').isObject().withMessage('filters must be an object'),
  body('alert_email').optional().isBoolean(),
  validateRequest,
];

const updateValidation = [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ max: 200 }),
  body('filters').optional().isObject(),
  body('alert_email').optional().isBoolean(),
  validateRequest,
];

router.get('/',     listSavedSearches);
router.post('/',    createValidation, createSavedSearch);
router.patch('/:id', updateValidation, updateSavedSearch);
router.delete('/:id', param('id').isUUID(), validateRequest, deleteSavedSearch);

export const savedSearchesRoutes = router;
