/**
 * France-specific routes
 * 
 * Routes for France-specific calculations (malus écologique, etc.)
 */

import express from 'express';
import { query } from 'express-validator';
import { getMalus } from '../controllers/frenchMalusController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * GET /api/v1/france/malus
 * Calculate French ecological malus
 */
router.get('/malus',
  [
    query('co2')
      .notEmpty()
      .withMessage('co2 is required')
      .isFloat({ min: 0 })
      .withMessage('co2 must be a non-negative number'),
    query('firstReg')
      .optional()
      .isISO8601()
      .withMessage('firstReg must be a valid ISO date (YYYY-MM-DD)'),
    query('regInFRDate')
      .optional()
      .isISO8601()
      .withMessage('regInFRDate must be a valid ISO date (YYYY-MM-DD)'),
    query('firstInFR')
      .notEmpty()
      .withMessage('firstInFR is required')
      .isBoolean()
      .withMessage('firstInFR must be a boolean'),
    query('category')
      .notEmpty()
      .withMessage('category is required')
      .isIn(['VP', 'VUL', 'OTHER'])
      .withMessage('category must be one of: VP, VUL, OTHER'),
    query('massKg')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('massKg must be a non-negative number'),
    query('enableWeightMalus')
      .optional()
      .isBoolean()
      .withMessage('enableWeightMalus must be a boolean'),
    validateRequest
  ],
  getMalus
);

export const franceRoutes = router;
