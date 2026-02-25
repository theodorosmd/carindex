import { logger } from '../utils/logger.js';
import { upsertListingsBatch } from '../services/ingestService.js';
import { saveRawListings } from '../services/rawIngestService.js';
import { processRawListings } from '../services/rawListingsProcessorService.js';

export async function ingestRawListings(req, res, next) {
  try {
    const { items, source_platform: sourcePlatform } = req.body || {};

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Body must be { items: [...], source_platform: "autoscout24" | "blocket" | ... }'
        }
      });
    }

    if (!sourcePlatform || typeof sourcePlatform !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'source_platform is required'
        }
      });
    }

    const maxBatch = parseInt(process.env.INGEST_MAX_BATCH || '500', 10);
    if (items.length > maxBatch) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Max ${maxBatch} items per request`
        }
      });
    }

    logger.info('Ingest raw listings request', {
      count: items.length,
      source_platform: sourcePlatform,
      userId: req.user?.id
    });

    const { saved, errors } = await saveRawListings(items, sourcePlatform);

    res.json({
      success: true,
      saved,
      errors: errors.length,
      max_batch: maxBatch
    });
  } catch (error) {
    logger.error('Error ingesting raw listings', { error: error.message });
    next(error);
  }
}

export async function triggerProcessRawListings(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 500;
    const sourcePlatform = req.query.source_platform || undefined;

    logger.info('Trigger process raw listings', {
      limit,
      source_platform: sourcePlatform,
      userId: req.user?.id
    });

    const result = await processRawListings({ limit, sourcePlatform });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error processing raw listings', { error: error.message });
    next(error);
  }
}

export async function ingestListings(req, res, next) {
  try {
    const payload = Array.isArray(req.body) ? req.body : req.body?.listings;

    if (!payload || !Array.isArray(payload)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Body must be an array of listings or { listings: [...] }'
        }
      });
    }

    if (payload.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Listings array cannot be empty'
        }
      });
    }

    const maxBatch = parseInt(process.env.INGEST_MAX_BATCH || '500', 10);
    if (payload.length > maxBatch) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Max ${maxBatch} listings per request`
        }
      });
    }

    logger.info('Ingest listings request', {
      count: payload.length,
      userId: req.user?.id
    });

    const result = await upsertListingsBatch(payload);

    res.json({
      success: true,
      ...result,
      max_batch: maxBatch
    });
  } catch (error) {
    logger.error('Error ingesting listings', { error: error.message });
    next(error);
  }
}
