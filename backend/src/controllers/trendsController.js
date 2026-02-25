import { getTrendsService } from '../services/trendsService.js';
import { logger } from '../utils/logger.js';

export async function getTrends(req, res, next) {
  try {
    const { brand, model, country = 'FR', period = '30m' } = req.query;

    logger.info('Trends request', { brand, model, country, period, userId: req.user?.id });

    const result = await getTrendsService({ brand, model, country, period });

    res.json(result);
  } catch (error) {
    logger.error('Error getting trends', { error: error.message });
    next(error);
  }
}









