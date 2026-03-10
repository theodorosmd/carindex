import { runAutoScout24Scraper } from '../services/autoscout24Service.js';
import { runLeBonCoinScraper } from '../services/leboncoinService.js';
import { runMobileDeScraper } from '../services/mobiledeService.js';
import { runGaspedaalScraper } from '../services/gaspedaalService.js';
import { runSubitoScraper } from '../services/subitoService.js';
import { createScraperRun, updateScraperRun } from '../services/ingestRunsService.js';
import { logger } from '../utils/logger.js';

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
      : ['subito', 'subito.it'].includes(src) ? 'subito'
      : ['lacentrale', 'lacentrale.fr'].includes(src) ? 'lacentrale'
      : ['gaspedaal', 'gaspedaal.nl'].includes(src) ? 'gaspedaal'
      : ['marktplaats', 'marktplaats.nl'].includes(src) ? 'marktplaats'
      : ['coches.net', 'cochesnet'].includes(src) ? 'coches.net'
      : ['2ememain', 'deuxememain', '2ememain.be'].includes(src) ? '2ememain'
      : ['finn', 'finn.no'].includes(src) ? 'finn'
      : ['otomoto', 'otomoto.pl', 'automoto'].includes(src) ? 'otomoto'
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

      case 'subito':
      case 'subito.it':
        result = await runSubitoScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 25), 50) : 15
        });
        break;

      case 'lacentrale':
      case 'lacentrale.fr':
        const { runLaCentraleScraper } = await import('../services/laCentraleService.js');
        result = await runLaCentraleScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 16), 50) : 15
        });
        break;

      case 'coches.net':
      case 'cochesnet':
        const { runCochesNetScraper } = await import('../services/cochesnetService.js');
        result = await runCochesNetScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 30), 50) : 15
        });
        break;

      case 'gaspedaal':
      case 'gaspedaal.nl':
        result = await runGaspedaalScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 100), 50) : 15
        });
        break;

      case 'marktplaats':
      case 'marktplaats.nl':
        const { runMarktplaatsScraper } = await import('../services/marktplaatsService.js');
        result = await runMarktplaatsScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 30), 50) : 15
        });
        break;

      case '2ememain':
      case 'deuxememain':
      case '2ememain.be':
        const { run2ememainScraper } = await import('../services/deuxememainService.js');
        result = await run2ememainScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 30), 50) : 15
        });
        break;

      case 'finn':
      case 'finn.no':
        const { runFinnScraper } = await import('../services/finnService.js');
        result = await runFinnScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 50), 50) : 15
        });
        break;

      case 'otomoto':
      case 'otomoto.pl':
      case 'automoto':
        const { runOtomotoScraper } = await import('../services/otomotoService.js');
        result = await runOtomotoScraper(searchUrls, {
          maxPages: maxResults ? Math.min(Math.ceil(maxResults / 32), 50) : 15
        });
        break;
        
      default:
        return res.status(400).json({
          error: `Unsupported source: ${source}. Supported sources: autoscout24, leboncoin, mobile.de, blocket, bilweb, bytbil, largus, subito, lacentrale, coches.net, gaspedaal, marktplaats, 2ememain, finn, otomoto`
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

