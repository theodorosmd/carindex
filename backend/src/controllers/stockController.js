import { analyzeStockService } from '../services/stockService.js';
import { logger } from '../utils/logger.js';

export async function analyzeStock(req, res, next) {
  try {
    const { vehicles } = req.body;

    logger.info('Stock analysis request', {
      vehicleCount: vehicles.length,
      userId: req.user?.id
    });

    const result = await analyzeStockService(vehicles);

    res.json(result);
  } catch (error) {
    logger.error('Error analyzing stock', { error: error.message });
    next(error);
  }
}









