import { getTrendsService } from '../services/trendsService.js';
import { logger } from '../utils/logger.js';

export async function getTrends(req, res, next) {
  try {
    const { brand, model, country, months = 12, year } = req.query;

    if (!brand || !model) {
      return res.status(400).json({ error: 'brand and model are required' });
    }

    logger.info('Trends request', { brand, model, country, months, year, userId: req.user?.id });

    const result = await getTrendsService({ brand, model, country, months, year });

    res.json(result);
  } catch (error) {
    logger.error('Error getting trends', { error: error.message });
    next(error);
  }
}









