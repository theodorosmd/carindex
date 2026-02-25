import { logger } from '../utils/logger.js';
import { createScraperRun, updateScraperRun, listScraperRuns, listListingsForRun } from '../services/ingestRunsService.js';

export async function createRun(req, res, next) {
  try {
    const { source_platform, status, started_at, webhook_url, metadata } = req.body || {};

    if (!source_platform) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'source_platform is required'
        }
      });
    }

    const run = await createScraperRun({
      source_platform,
      status,
      started_at,
      webhook_url,
      metadata
    });

    res.status(201).json({
      success: true,
      run
    });
  } catch (error) {
    logger.error('Error creating run', { error: error.message });
    next(error);
  }
}

export async function updateRun(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    if (!id) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Run id is required'
        }
      });
    }

    const run = await updateScraperRun(id, updates);

    res.json({
      success: true,
      run
    });
  } catch (error) {
    logger.error('Error updating run', { error: error.message });
    next(error);
  }
}

export async function listRuns(req, res, next) {
  try {
    let limit = parseInt(req.query.limit, 10) || 50;
    let offset = parseInt(req.query.offset, 10) || 0;
    const { source_platform, status, started_from, started_to, next_token } = req.query;

    if (next_token) {
      try {
        const decoded = JSON.parse(Buffer.from(next_token, 'base64').toString('utf-8'));
        offset = parseInt(decoded.offset, 10) || offset;
        limit = parseInt(decoded.limit, 10) || limit;
      } catch (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid next_token'
          }
        });
      }
    }

    const result = await listScraperRuns({
      limit,
      offset,
      source_platform,
      status,
      started_from,
      started_to
    });

    const nextOffset = offset + limit;
    const nextToken = nextOffset < result.total ? Buffer.from(JSON.stringify({ offset: nextOffset, limit })).toString('base64') : null;

    res.json({
      success: true,
      ...result,
      limit,
      offset,
      next_token: nextToken
    });
  } catch (error) {
    logger.error('Error listing runs', { error: error.message });
    next(error);
  }
}

export async function exportRunsCsv(req, res, next) {
  try {
    const { source_platform, status, started_from, started_to } = req.query;

    const result = await listScraperRuns({
      limit: 5000,
      offset: 0,
      source_platform,
      status,
      started_from,
      started_to
    });

    const header = [
      'id',
      'source_platform',
      'status',
      'started_at',
      'finished_at',
      'total_scraped',
      'total_saved',
      'total_failed',
      'error_message'
    ];

    const rows = (result.runs || []).map(run => ([
      run.id,
      run.source_platform,
      run.status,
      run.started_at,
      run.finished_at,
      run.total_scraped || 0,
      run.total_saved || 0,
      run.total_failed || 0,
      run.error_message ? String(run.error_message).replace(/\r?\n/g, ' ') : ''
    ]));

    const csv = [header, ...rows]
      .map(line => line.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scraper_runs.csv"');
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Error exporting runs csv', { error: error.message });
    next(error);
  }
}

export async function listRunListings(req, res, next) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (!id) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Run id is required'
        }
      });
    }

    const result = await listListingsForRun({ run_id: id, limit, offset });

    res.json({
      success: true,
      ...result,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Error listing run listings', { error: error.message });
    next(error);
  }
}

export async function exportRunListingsCsv(req, res, next) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 5000;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (!id) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Run id is required'
        }
      });
    }

    const result = await listListingsForRun({ run_id: id, limit, offset });

    const header = [
      'id',
      'source_platform',
      'source_listing_id',
      'brand',
      'model',
      'year',
      'price',
      'currency',
      'status',
      'url',
      'last_seen',
      'created_at'
    ];

    const rows = (result.listings || []).map(listing => ([
      listing.id,
      listing.source_platform,
      listing.source_listing_id,
      listing.brand,
      listing.model,
      listing.year,
      listing.price,
      listing.currency,
      listing.status,
      listing.url,
      listing.last_seen,
      listing.created_at
    ]));

    const csv = [header, ...rows]
      .map(line => line.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="scraper_run_${id}_listings.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Error exporting run listings csv', { error: error.message });
    next(error);
  }
}
