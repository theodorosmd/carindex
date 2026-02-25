import { createAlertService, getAlertEventsService } from '../services/alertsService.js';
import { logger } from '../utils/logger.js';

export async function createAlert(req, res, next) {
  try {
    const { name, type, criteria, threshold, webhook_url } = req.body;

    logger.info('Alert creation request', { name, type, userId: req.user?.id });

    const result = await createAlertService({
      userId: req.user.id,
      name,
      type,
      criteria,
      threshold,
      webhook_url
    });

    res.json(result);
  } catch (error) {
    logger.error('Error creating alert', { error: error.message });
    next(error);
  }
}

export async function getAlertEvents(req, res, next) {
  try {
    const { alertId } = req.params;
    const { limit = 50, offset = 0, since } = req.query;

    const result = await getAlertEventsService({
      alertId,
      userId: req.user.id,
      limit: parseInt(limit),
      offset: parseInt(offset),
      since
    });

    res.json(result);
  } catch (error) {
    logger.error('Error getting alert events', { error: error.message });
    next(error);
  }
}









