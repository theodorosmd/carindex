import {
  getAllAutoScrapers,
  getAutoScraperById,
  createAutoScraper,
  updateAutoScraper,
  deleteAutoScraper,
  runAutoScraper,
  resumeAutoScraper
} from '../services/autoScraperService.js';
import { reloadAutoScrapers } from '../jobs/autoScraperJob.js';
import { logger } from '../utils/logger.js';

/**
 * Get all auto scrapers
 * GET /api/v1/admin/auto-scrapers
 */
export async function getAutoScrapers(req, res, next) {
  try {
    const scrapers = await getAllAutoScrapers();
    res.json({
      success: true,
      scrapers
    });
  } catch (error) {
    logger.error('Error in getAutoScrapers controller', { 
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return a more user-friendly error response instead of letting it propagate
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch auto scrapers. Please try again later.'
      }
    });
  }
}

/**
 * Get auto scraper by ID
 * GET /api/v1/admin/auto-scrapers/:id
 */
export async function getAutoScraper(req, res, next) {
  try {
    const { id } = req.params;
    const scraper = await getAutoScraperById(id);
    
    if (!scraper) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Auto scraper not found'
        }
      });
    }

    res.json({
      success: true,
      scraper
    });
  } catch (error) {
    logger.error('Error in getAutoScraper controller', { error: error.message });
    next(error);
  }
}

/**
 * Create auto scraper
 * POST /api/v1/admin/auto-scrapers
 */
export async function createAutoScraperController(req, res, next) {
  try {
    const { source, name, search_urls, schedule_cron, enabled, max_results, result_limit_per_thread } = req.body;

    if (!source || !name || !search_urls || !schedule_cron) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'source, name, search_urls, and schedule_cron are required'
        }
      });
    }

    const scraper = await createAutoScraper({
      source,
      name,
      search_urls: Array.isArray(search_urls) ? search_urls : [search_urls],
      schedule_cron,
      max_results: max_results || 1000,
      result_limit_per_thread: result_limit_per_thread || 100,
      enabled: enabled !== false,
      created_by: req.user.id
    });

    // Reload scrapers to include the new one
    await reloadAutoScrapers();

    res.status(201).json({
      success: true,
      message: 'Auto scraper created successfully',
      scraper
    });
  } catch (error) {
    logger.error('Error in createAutoScraper controller', { error: error.message });
    next(error);
  }
}

/**
 * Update auto scraper
 * PATCH /api/v1/admin/auto-scrapers/:id
 */
export async function updateAutoScraperController(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const scraper = await updateAutoScraper(id, updates);

    // Reload scrapers if enabled status or schedule changed
    if (updates.enabled !== undefined || updates.schedule_cron) {
      await reloadAutoScrapers();
    }

    res.json({
      success: true,
      message: 'Auto scraper updated successfully',
      scraper
    });
  } catch (error) {
    logger.error('Error in updateAutoScraper controller', { error: error.message });
    next(error);
  }
}

/**
 * Delete auto scraper
 * DELETE /api/v1/admin/auto-scrapers/:id
 */
export async function deleteAutoScraperController(req, res, next) {
  try {
    const { id } = req.params;
    await deleteAutoScraper(id);

    // Reload scrapers to remove the deleted one
    await reloadAutoScrapers();

    res.json({
      success: true,
      message: 'Auto scraper deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteAutoScraper controller', { error: error.message });
    next(error);
  }
}

/**
 * Run auto scraper manually
 * POST /api/v1/admin/auto-scrapers/:id/run
 */
export async function runAutoScraperController(req, res, next) {
  try {
    const { id } = req.params;
    const { force } = req.query; // Allow forcing even if status is 'running'
    const scraper = await getAutoScraperById(id);

    if (!scraper) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Auto scraper not found'
        }
      });
    }

    // If scraper is running and force is not set, reset status first
    if (scraper.last_run_status === 'running' && !force) {
      logger.warn('Scraper is already running, resetting status', { id: scraper.id });
      await updateAutoScraper(scraper.id, {
        last_run_status: null
      });
    }

    // Run scraper in background (don't await)
    runAutoScraper(scraper).catch(error => {
      logger.error('Error in background scraper run', { 
        error: error.message,
        scraperId: scraper.id 
      });
    });

    // Return immediately with scraper info
    res.json({
      success: true,
      message: 'Auto scraper run started',
      scraper: {
        id: scraper.id,
        name: scraper.name,
        source: scraper.source,
        status: 'running'
      }
    });
  } catch (error) {
    logger.error('Error in runAutoScraper controller', { error: error.message });
    next(error);
  }
}

/**
 * Reset auto scraper status (if stuck in 'running')
 * POST /api/v1/admin/auto-scrapers/:id/reset-status
 */
export async function resetAutoScraperStatusController(req, res, next) {
  try {
    const { id } = req.params;
    const scraper = await getAutoScraperById(id);

    if (!scraper) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Auto scraper not found'
        }
      });
    }

    await updateAutoScraper(scraper.id, {
      last_run_status: null
    });

    res.json({
      success: true,
      message: 'Auto scraper status reset successfully'
    });
  } catch (error) {
    logger.error('Error in resetAutoScraperStatus controller', { error: error.message });
    next(error);
  }
}

/**
 * Resume auto scraper from where it stopped
 * POST /api/v1/admin/auto-scrapers/:id/resume
 */
export async function resumeAutoScraperController(req, res, next) {
  try {
    const { id } = req.params;
    const scraper = await getAutoScraperById(id);

    if (!scraper) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Auto scraper not found'
        }
      });
    }

    // Check if there are processed URLs to resume from
    const lastResult = scraper.last_run_result || {};
    const processedUrls = lastResult.processedUrls || [];
    
    if (processedUrls.length === 0 && scraper.last_run_status === 'success') {
      return res.status(400).json({
        error: {
          code: 'NOTHING_TO_RESUME',
          message: 'No previous run to resume from. Use "run" instead.'
        }
      });
    }

    // Run scraper in background (don't await)
    resumeAutoScraper(scraper).catch(error => {
      logger.error('Error in background scraper resume', { 
        error: error.message,
        scraperId: scraper.id 
      });
    });

    // Return immediately with scraper info
    res.json({
      success: true,
      message: 'Auto scraper resume started',
      scraper: {
        id: scraper.id,
        name: scraper.name,
        source: scraper.source,
        status: 'running',
        processedUrlsCount: processedUrls.length
      }
    });
  } catch (error) {
    logger.error('Error in resumeAutoScraper controller', { error: error.message });
    next(error);
  }
}

