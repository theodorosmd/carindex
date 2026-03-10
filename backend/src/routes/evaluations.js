import express from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  listEvaluations,
  getEvaluation,
  updateEvaluation,
  deleteEvaluation,
  compareEvaluations,
  recalculateEvaluation
} from '../controllers/evaluationsController.js';
import {
  batchCreateEvaluations,
  getBatchStatus
} from '../controllers/batchEvaluationController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation middleware
const updateValidation = [
  body('name').optional().isString().isLength({ max: 255 }).withMessage('name must be a string with max 255 characters'),
  body('notes').optional().isString().withMessage('notes must be a string'),
  validateRequest
];

const compareValidation = [
  body('evaluation_ids').isArray({ min: 2, max: 5 }).withMessage('evaluation_ids must be an array with 2-5 items'),
  body('evaluation_ids.*').isUUID().withMessage('Each evaluation_id must be a valid UUID'),
  validateRequest
];

// GET /api/v1/evaluations - List all evaluations
router.get('/', (req, res, next) => {
  console.log('=== Evaluations route GET / CALLED ===', { path: req.path });
  logger.info('Evaluations route GET / called', { path: req.path });
  listEvaluations(req, res, next);
});

// GET /api/v1/evaluations/batch-status - Get batch processing status (must be before /:id)
router.get('/batch-status', getBatchStatus);

// GET /api/v1/evaluations/:id - Get specific evaluation
router.get('/:id', param('id').isUUID().withMessage('id must be a valid UUID'), validateRequest, getEvaluation);

// PUT /api/v1/evaluations/:id - Update evaluation
router.put('/:id', param('id').isUUID().withMessage('id must be a valid UUID'), updateValidation, updateEvaluation);

// DELETE /api/v1/evaluations/:id - Delete evaluation
router.delete('/:id', param('id').isUUID().withMessage('id must be a valid UUID'), validateRequest, deleteEvaluation);

// POST /api/v1/evaluations/compare - Compare evaluations
router.post('/compare', compareValidation, compareEvaluations);

// POST /api/v1/evaluations/:id/recalculate - Recalculate evaluation with updated rules
router.post('/:id/recalculate', param('id').isUUID().withMessage('id must be a valid UUID'), validateRequest, recalculateEvaluation);

// POST /api/v1/evaluations/batch - Process multiple URLs in batch
router.post('/batch', 
  body('urls').isArray({ min: 1, max: 50 }).withMessage('urls must be an array with 1-50 items'),
  body('urls.*').isURL().withMessage('Each URL must be a valid URL'),
  body('options').optional().isObject().withMessage('options must be an object'),
  validateRequest,
  batchCreateEvaluations
);

export const evaluationsRoutes = router;
