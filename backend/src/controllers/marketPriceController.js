import { calculateMarketPrice } from '../services/marketPriceService.js';
import { logger } from '../utils/logger.js';

export async function getMarketPrice(req, res, next) {
  try {
    const {
      brand,
      model,
      year,
      mileage,
      country = 'FR',
      fuel_type,
      transmission
    } = req.query;

    logger.info('Market price request', {
      brand,
      model,
      year,
      mileage,
      country,
      userId: req.user?.id
    });

    const result = await calculateMarketPrice({
      brand,
      model,
      year: parseInt(year),
      mileage: parseInt(mileage),
      country,
      fuel_type,
      transmission
    });

    res.json(result);
  } catch (error) {
    logger.error('Error getting market price', { error: error.message, stack: error.stack });
    next(error);
  }
}









