import { runAutoScout24Scraper } from '../services/autoscout24Service.js';
import { runLeBonCoinScraper } from '../services/leboncoinService.js';
import { runMobileDeScraper } from '../services/mobiledeService.js';
import { createScraperRun, updateScraperRun } from '../services/ingestRunsService.js';
import { logger } from '../utils/logger.js';

// For now, allow unauthenticated access (you can add auth later)
const checkAuth = (req, res, next) => {
  // TODO: Add proper authentication
  // For development, allow all requests
  next();
};

/**
 * Run scraper for a specific source
 */
export async function runScraper(req, res, next) {
  let runId = null;
  try {
    const { source = 'autoscout24', searchUrls, resultLimitPerThread, maxResults } = req.body;

    if (!searchUrls || (Array.isArray(searchUrls) && searchUrls.length === 0)) {
      return res.status(400).json({
        error: 'searchUrls is required. Provide one or more search URLs.'
      });
    }

    logger.info('Scraper run requested', {
      source,
      searchUrls,
      userId: req.user?.id
    });

    const src = (source || 'autoscout24').toLowerCase();
    const sourcePlatform = ['autoscout24', 'autoscout'].includes(src) ? 'autoscout24'
      : ['leboncoin', 'leboncoin.fr'].includes(src) ? 'leboncoin'
      : ['mobile.de', 'mobilede'].includes(src) ? 'mobile.de'
      : ['largus', 'largus.fr', 'argus'].includes(src) ? 'largus'
      : src;

    try {
      const run = await createScraperRun({ source_platform: sourcePlatform, status: 'running' });
      runId = run?.id || null;
    } catch (runErr) {
      logger.warn('Could not create scraper run', { error: runErr.message });
    }

    let result;
    
    switch (source.toLowerCase()) {
      case 'autoscout24':
      case 'autoscout':
        result = await runAutoScout24Scraper(searchUrls, {
          resultLimitPerThread: resultLimitPerThread || 100,
          maxResults: maxResults || 1000
        });
        break;
        
      case 'leboncoin':
      case 'leboncoin.fr':
        result = await runLeBonCoinScraper(searchUrls, {
          resultLimitPerThread: resultLimitPerThread || 100,
          maxResults: maxResults || 1000
        });
        break;
        
      case 'mobile.de':
      case 'mobilede':
        result = await runMobileDeScraper(searchUrls, {
          resultLimitPerThread: resultLimitPerThread || 100,
          maxResults: maxResults || 1000
        });
        break;
        
      case 'blocket':
        const { runBlocketScraper } = await import('../services/blocketService.js');
        result = await runBlocketScraper(searchUrls, {
          resultLimitPerThread: resultLimitPerThread || 100,
          maxResults: maxResults || 1000
        });
        break;
        
      case 'bilweb':
        const { runBilwebScraper } = await import('../services/bilwebService.js');
        result = await runBilwebScraper(searchUrls, {
          resultLimitPerThread: resultLimitPerThread || 100,
          maxResults: maxResults || 1000
        });
        break;
        
      case 'bytbil':
        const { runBytbilScraper } = await import('../services/bytbilService.js');
        result = await runBytbilScraper(searchUrls, {
          resultLimitPerThread: resultLimitPerThread || 100,
          maxResults: maxResults || 1000
        });
        break;

      case 'largus':
      case 'largus.fr':
      case 'argus':
        const { runLargusScraper } = await import('../services/largusService.js');
        result = await runLargusScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 15), 50) : 10
        });
        break;
        
      default:
        return res.status(400).json({
          error: `Unsupported source: ${source}. Supported sources: autoscout24, leboncoin, mobile.de, blocket, bilweb, bytbil, largus`
        });
    }

    if (runId) {
      try {
        await updateScraperRun(runId, {
          status: 'success',
          total_scraped: result?.totalScraped || 0,
          total_saved: result?.saved || 0,
          total_failed: result?.errors || 0
        });
      } catch (runErr) {
        logger.warn('Could not update scraper run', { error: runErr.message });
      }
    }

    res.json({
      success: true,
      message: 'Scraper completed successfully',
      source,
      runId,
      ...result
    });
  } catch (error) {
    if (runId) {
      try {
        await updateScraperRun(runId, { status: 'failed', error_message: error.message });
      } catch (runErr) {
        logger.warn('Could not update scraper run', { error: runErr.message });
      }
    }
    logger.error('Error running scraper', { error: error.message });
    next(error);
  }
}

/**
 * Get scraper status
 */
export async function getScraperStatus(req, res, next) {
  try {
    // Get status from scraper run
    res.json({
      status: 'ready',
      lastRun: null,
      nextRun: null
    });
  } catch (error) {
    logger.error('Error getting scraper status', error);
    next(error);
  }
}

/**
 * Get specific scraper run status (Puppeteer scrapers - no external run ID)
 */
export async function getScraperRunStatus(req, res, next) {
  try {
    const { runId } = req.params;
    res.json({
      success: true,
      runId,
      status: 'N/A',
      message: 'Puppeteer scrapers run synchronously. No external run tracking.'
    });
  } catch (error) {
    logger.error('Error getting scraper run status', { error: error.message, runId: req.params.runId });
    next(error);
  }
}

