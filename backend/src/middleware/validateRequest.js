import { validationResult } from 'express-validator';

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'INVALID_PARAMETER',
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
}









