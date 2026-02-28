import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { createScraperRun, updateScraperRun } from './ingestRunsService.js';
import { markDisappearedAsSold } from './disappearedListingService.js';
import { runAutoScout24Scraper } from './autoscout24Service.js';
import { runMobileDeScraper } from './mobiledeService.js';
import { runLeBonCoinScraper } from './leboncoinService.js';
import { runSubitoScraper } from './subitoService.js';
import { runGaspedaalScraper } from './gaspedaalService.js';

function isMissingTableError(error) {
  if (!error) return false;
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message || '');
}

function isMissingColumnError(error) {
  if (!error) return false;
  return error.code === '42703' || /column .* does not exist/i.test(error.message || '');
}

function shouldReturnEmpty(error) {
  return isMissingTableError(error) || isMissingColumnError(error);
}

/**
 * Get all enabled auto scrapers
 */
export async function getEnabledAutoScrapers() {
  try {
    const { data, error } = await supabase
      .from('auto_scrapers')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    if (error) {
      if (shouldReturnEmpty(error)) {
        logger.warn('auto_scrapers query failed, returning empty enabled list', { error: error.message });
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    logger.error('Error getting enabled auto scrapers', { error: error.message });
    throw error;
  }
}

/**
 * Get all auto scrapers (for admin)
 */
export async function getAllAutoScrapers() {
  try {
    const { data, error } = await supabase
      .from('auto_scrapers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (shouldReturnEmpty(error)) {
        logger.warn('auto_scrapers query failed, returning empty list', { error: error.message });
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    logger.error('Error getting all auto scrapers', { error: error.message });
    throw error;
  }
}

/**
 * Get auto scraper by ID
 */
export async function getAutoScraperById(id) {
  try {
    const { data, error } = await supabase
      .from('auto_scrapers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (shouldReturnEmpty(error)) {
        logger.warn('auto_scrapers query failed, cannot fetch scraper by id', { id, error: error.message });
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    logger.error('Error getting auto scraper by ID', { error: error.message, id });
    throw error;
  }
}

/**
 * Create auto scraper
 */
export async function createAutoScraper(scraperData) {
  try {
    const { data, error } = await supabase
      .from('auto_scrapers')
      .insert({
        source: scraperData.source,
        name: scraperData.name,
        search_urls: Array.isArray(scraperData.search_urls) ? scraperData.search_urls : [scraperData.search_urls],
        schedule_cron: scraperData.schedule_cron,
        max_results: scraperData.max_results || 1000,
        result_limit_per_thread: scraperData.result_limit_per_thread || 100,
        enabled: scraperData.enabled !== false,
        created_by: scraperData.created_by
      })
      .select()
      .single();

    if (error) throw error;
    logger.info('Auto scraper created', { id: data.id, source: data.source });
    return data;
  } catch (error) {
    logger.error('Error creating auto scraper', { error: error.message });
    throw error;
  }
}

/**
 * Update auto scraper
 */
export async function updateAutoScraper(id, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('auto_scrapers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    logger.info('Auto scraper updated', { id, updates });
    return data;
  } catch (error) {
    logger.error('Error updating auto scraper', { error: error.message, id });
    throw error;
  }
}

/**
 * Delete auto scraper
 */
export async function deleteAutoScraper(id) {
  try {
    const { error } = await supabase
      .from('auto_scrapers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    logger.info('Auto scraper deleted', { id });
    return true;
  } catch (error) {
    logger.error('Error deleting auto scraper', { error: error.message, id });
    throw error;
  }
}

/**
 * Run a specific auto scraper
 */
export async function runAutoScraper(scraper) {
  let runId = null;
  const runStartedAt = new Date();
  try {
    logger.info('Running auto scraper', { id: scraper.id, source: scraper.source, name: scraper.name });

    // Create scraper run for dashboard tracking
    try {
      const run = await createScraperRun({
        source_platform: scraper.source,
        status: 'running'
      });
      runId = run?.id || null;
    } catch (runErr) {
      logger.warn('Could not create scraper run (table may be missing)', { error: runErr.message });
    }

    // Update status to running
    await updateAutoScraper(scraper.id, {
      last_run_at: new Date().toISOString(),
      last_run_status: 'running'
    });

    let result;
    // Use scraper-specific options if stored, otherwise defaults
    // If maxResults is very high (>= 999999), we want unlimited scraping
    // In that case, we should set a high resultLimitPerThread or remove the limit
    // Ensure max_results is a number for comparison
    const maxResultsNum = typeof scraper.max_results === 'string' 
      ? parseInt(scraper.max_results, 10) 
      : (scraper.max_results || 1000);
    const isUnlimited = maxResultsNum >= 999999;
    
    const options = {
      // IMPORTANT: resultLimitPerThread must be at least equal to maxResults
      // Otherwise the scraper may stop at resultLimitPerThread even if maxResults is higher
      resultLimitPerThread: isUnlimited 
        ? 10000 
        : Math.max(maxResultsNum, scraper.result_limit_per_thread || maxResultsNum),
      maxResults: isUnlimited ? undefined : maxResultsNum,
      maxPages: isUnlimited ? 9999 : Math.min(Math.ceil(maxResultsNum / 30), 100)
    };
    
    // Log the options being used
    logger.info('Auto scraper options', {
      isUnlimited,
      maxResults: options.maxResults,
      resultLimitPerThread: options.resultLimitPerThread,
      originalMaxResults: scraper.max_results,
      maxResultsNum,
      maxResultsType: typeof scraper.max_results
    });

    // Progress callback to update database in real-time
    const progressCallback = async (progress) => {
      try {
        // Get current last_run_result to preserve processedUrls
        const currentScraper = await getAutoScraperById(scraper.id);
        const currentResult = currentScraper?.last_run_result || {};
        
        await updateAutoScraper(scraper.id, {
          last_run_result: {
            totalScraped: progress.totalScraped || 0,
            saved: progress.totalSaved || 0,
            runId: progress.runId,
            status: progress.status,
            processedUrls: progress.processedUrls || currentResult.processedUrls || [],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.warn('Error updating scraper progress', { error: error.message });
      }
    };

    switch (scraper.source) {
      case 'autoscout24':
        result = await runAutoScout24Scraper(scraper.search_urls, options, progressCallback);
        break;
      case 'mobile.de':
        result = await runMobileDeScraper(scraper.search_urls, options);
        break;
      case 'leboncoin':
        result = await runLeBonCoinScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'blocket':
        const { runBlocketScraper } = await import('./blocketService.js');
        result = await runBlocketScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'bilweb':
        const { runBilwebScraper } = await import('./bilwebService.js');
        result = await runBilwebScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'bytbil':
        const { runBytbilScraper } = await import('./bytbilService.js');
        result = await runBytbilScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'largus':
      case 'largus.fr':
      case 'argus':
        const { runLargusScraper } = await import('./largusService.js');
        result = await runLargusScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'subito':
      case 'subito.it':
        result = await runSubitoScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'lacentrale':
      case 'lacentrale.fr':
        const { runLaCentraleScraper } = await import('./laCentraleService.js');
        result = await runLaCentraleScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'coches.net':
      case 'cochesnet':
        const { runCochesNetScraper } = await import('./cochesnetService.js');
        result = await runCochesNetScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'gaspedaal':
      case 'gaspedaal.nl':
        result = await runGaspedaalScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'marktplaats':
      case 'marktplaats.nl':
        const { runMarktplaatsScraper } = await import('./marktplaatsService.js');
        result = await runMarktplaatsScraper(scraper.search_urls, {
          maxPages: options.maxPages || 9999
        }, progressCallback);
        break;
      case '2ememain':
      case 'deuxememain':
        const { run2ememainScraper } = await import('./deuxememainService.js');
        result = await run2ememainScraper(scraper.search_urls, {
          maxPages: options.maxPages || 9999
        }, progressCallback);
        break;
      case 'finn':
      case 'finn.no':
        const { runFinnScraper } = await import('./finnService.js');
        result = await runFinnScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'otomoto':
      case 'otomoto.pl':
      case 'automoto':
        const { runOtomotoScraper } = await import('./otomotoService.js');
        result = await runOtomotoScraper(scraper.search_urls, { maxPages: options.maxPages || 9999 }, progressCallback);
        break;
      default:
        throw new Error(`Unsupported source: ${scraper.source}`);
    }

    // Mark disappeared listings as sold (reduces broken "View original listing" links)
    try {
      const saleResult = await markDisappearedAsSold(runId, scraper.source, runStartedAt);
      if (saleResult.markedAsSold > 0) {
        logger.info('Disappeared listings marked as sold', {
          source: scraper.source,
          markedAsSold: saleResult.markedAsSold
        });
      }
    } catch (saleErr) {
      logger.warn('Could not mark disappeared listings as sold', { source: scraper.source, error: saleErr.message });
    }

    // Update scraper run with success
    if (runId) {
      try {
        await updateScraperRun(runId, {
          status: 'success',
          total_scraped: result.totalScraped || 0,
          total_saved: result.saved || 0,
          total_failed: result.errors || 0
        });
      } catch (runErr) {
        logger.warn('Could not update scraper run', { error: runErr.message });
      }
    }

    // Update with success result
    await updateAutoScraper(scraper.id, {
      last_run_status: 'success',
      last_run_result: {
        totalScraped: result.totalScraped || 0,
        saved: result.saved || 0,
        runId: runId || result.runId,
        processedUrls: result.processedUrls || [],
        status: result.status || 'SUCCEEDED',
        timestamp: new Date().toISOString()
      }
    });

    logger.info('Auto scraper completed successfully', {
      id: scraper.id,
      source: scraper.source,
      totalScraped: result.totalScraped,
      saved: result.saved
    });

    return result;
  } catch (error) {
    logger.error('Error running auto scraper', {
      error: error.message,
      id: scraper.id,
      source: scraper.source
    });

    // Update scraper run with failed status
    if (runId) {
      try {
        await updateScraperRun(runId, {
          status: 'failed',
          error_message: error.message
        });
      } catch (runErr) {
        logger.warn('Could not update scraper run', { error: runErr.message });
      }
    }

    // Update with error result (preserve processed URLs if any)
    const currentScraper = await getAutoScraperById(scraper.id);
    const currentResult = currentScraper?.last_run_result || {};
    await updateAutoScraper(scraper.id, {
      last_run_status: 'error',
      last_run_result: {
        error: error.message,
        processedUrls: currentResult.processedUrls || [],
        timestamp: new Date().toISOString()
      }
    });

    throw error;
  }
}

/**
 * Resume a failed or incomplete auto scraper
 * This will continue from where it left off, skipping already processed URLs
 */
export async function resumeAutoScraper(scraper) {
  let runId = null;
  try {
    logger.info('Resuming auto scraper', { id: scraper.id, source: scraper.source, name: scraper.name });

    // Create scraper run for dashboard tracking
    try {
      const run = await createScraperRun({
        source_platform: scraper.source,
        status: 'running'
      });
      runId = run?.id || null;
    } catch (runErr) {
      logger.warn('Could not create scraper run (table may be missing)', { error: runErr.message });
    }

    // Get processed URLs from last run result
    const lastResult = scraper.last_run_result || {};
    const processedUrls = lastResult.processedUrls || [];
    
    logger.info('Resuming with processed URLs', {
      scraperId: scraper.id,
      processedUrlsCount: processedUrls.length,
      totalUrls: Array.isArray(scraper.search_urls) ? scraper.search_urls.length : 1
    });

    // Update status to running
    await updateAutoScraper(scraper.id, {
      last_run_at: new Date().toISOString(),
      last_run_status: 'running'
    });

    let result;
    const maxResultsNum = typeof scraper.max_results === 'string' 
      ? parseInt(scraper.max_results, 10) 
      : (scraper.max_results || 1000);
    const isUnlimited = maxResultsNum >= 999999;
    
    const options = {
      resultLimitPerThread: isUnlimited 
        ? 10000 
        : Math.max(maxResultsNum, scraper.result_limit_per_thread || maxResultsNum),
      maxResults: isUnlimited ? undefined : maxResultsNum,
      maxPages: isUnlimited ? 9999 : Math.min(Math.ceil(maxResultsNum / 30), 100),
      processedUrls: processedUrls
    };
    
    // Progress callback to update database in real-time
    const progressCallback = async (progress) => {
      try {
        // Get current last_run_result to preserve processedUrls
        const currentScraper = await getAutoScraperById(scraper.id);
        const currentResult = currentScraper?.last_run_result || {};
        
        await updateAutoScraper(scraper.id, {
          last_run_result: {
            totalScraped: progress.totalScraped || 0,
            saved: progress.totalSaved || 0,
            runId: progress.runId,
            status: progress.status,
            processedUrls: progress.processedUrls || currentResult.processedUrls || processedUrls,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.warn('Error updating scraper progress', { error: error.message });
      }
    };

    switch (scraper.source) {
      case 'autoscout24':
        result = await runAutoScout24Scraper(scraper.search_urls, options, progressCallback);
        break;
      case 'mobile.de':
        result = await runMobileDeScraper(scraper.search_urls, options);
        break;
      case 'leboncoin':
        result = await runLeBonCoinScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'blocket':
        const { runBlocketScraper } = await import('./blocketService.js');
        result = await runBlocketScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'bilweb':
        const { runBilwebScraper } = await import('./bilwebService.js');
        result = await runBilwebScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'bytbil':
        const { runBytbilScraper } = await import('./bytbilService.js');
        result = await runBytbilScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'largus':
      case 'largus.fr':
      case 'argus':
        const { runLargusScraper } = await import('./largusService.js');
        result = await runLargusScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'subito':
      case 'subito.it':
        result = await runSubitoScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'lacentrale':
      case 'lacentrale.fr':
        const { runLaCentraleScraper: runLaCentraleScraperResume } = await import('./laCentraleService.js');
        result = await runLaCentraleScraperResume(scraper.search_urls, options, progressCallback);
        break;
      case 'coches.net':
      case 'cochesnet':
        const { runCochesNetScraper: runCochesNetScraperResume } = await import('./cochesnetService.js');
        result = await runCochesNetScraperResume(scraper.search_urls, options, progressCallback);
        break;
      case 'gaspedaal':
      case 'gaspedaal.nl':
        result = await runGaspedaalScraper(scraper.search_urls, options, progressCallback);
        break;
      case 'marktplaats':
      case 'marktplaats.nl':
        const { runMarktplaatsScraper: runMarktplaatsScraperResume } = await import('./marktplaatsService.js');
        result = await runMarktplaatsScraperResume(scraper.search_urls, {
          maxPages: options.maxPages || 9999
        }, progressCallback);
        break;
      case '2ememain':
      case 'deuxememain':
        const { run2ememainScraper: run2ememainResume } = await import('./deuxememainService.js');
        result = await run2ememainResume(scraper.search_urls, {
          maxPages: options.maxPages || 9999
        }, progressCallback);
        break;
      case 'finn':
      case 'finn.no':
        const { runFinnScraper: runFinnScraperResume } = await import('./finnService.js');
        result = await runFinnScraperResume(scraper.search_urls, options, progressCallback);
        break;
      case 'otomoto':
      case 'otomoto.pl':
      case 'automoto':
        const { runOtomotoScraper: runOtomotoScraperResume } = await import('./otomotoService.js');
        result = await runOtomotoScraperResume(scraper.search_urls, { maxPages: options.maxPages || 9999 }, progressCallback);
        break;
      default:
        throw new Error(`Unsupported source: ${scraper.source}`);
    }

    // Merge processed URLs from result
    const finalProcessedUrls = result.processedUrls || processedUrls;

    // Update scraper run with success
    if (runId) {
      try {
        await updateScraperRun(runId, {
          status: 'success',
          total_scraped: result.totalScraped || 0,
          total_saved: result.saved || 0,
          total_failed: result.errors || 0
        });
      } catch (runErr) {
        logger.warn('Could not update scraper run', { error: runErr.message });
      }
    }

    // Update with success result
    await updateAutoScraper(scraper.id, {
      last_run_status: 'success',
      last_run_result: {
        totalScraped: result.totalScraped || 0,
        saved: result.saved || 0,
        runId: runId || result.runId,
        processedUrls: finalProcessedUrls,
        status: result.status || 'SUCCEEDED',
        timestamp: new Date().toISOString()
      }
    });

    logger.info('Auto scraper resumed successfully', {
      id: scraper.id,
      source: scraper.source,
      totalScraped: result.totalScraped,
      saved: result.saved,
      processedUrlsCount: finalProcessedUrls.length
    });

    return result;
  } catch (error) {
    logger.error('Error resuming auto scraper', {
      error: error.message,
      id: scraper.id,
      source: scraper.source
    });

    // Update scraper run with failed status
    if (runId) {
      try {
        await updateScraperRun(runId, {
          status: 'failed',
          error_message: error.message
        });
      } catch (runErr) {
        logger.warn('Could not update scraper run', { error: runErr.message });
      }
    }

    // Update with error result (but preserve processed URLs)
    const lastResult = scraper.last_run_result || {};
    await updateAutoScraper(scraper.id, {
      last_run_status: 'error',
      last_run_result: {
        error: error.message,
        processedUrls: lastResult.processedUrls || [],
        timestamp: new Date().toISOString()
      }
    });

    throw error;
  }
}

