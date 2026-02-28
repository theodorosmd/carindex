/**
 * Scraping continu : lance tous les scrapers jusqu'à épuisement de chaque source.
 * Chaque scraper tourne sans limite de pages (jusqu'à page vide).
 * À la fin d'un cycle complet, attend N heures puis recommence (boucle infinie).
 *
 * Env: ENABLE_CONTINUOUS_SCRAPING=true
 *      CONTINUOUS_SCRAPE_INTERVAL_HOURS=0 (0 = redémarrage immédiat)
 */
import { runAllScrapersFull } from '../scripts/run-all-scrapers-full.js';
import { logger } from '../utils/logger.js';

let isRunning = false;
let stopRequested = false;

/**
 * Démarre le job de scraping continu
 */
export function startContinuousScrapingJob() {
  if (isRunning) {
    logger.warn('Continuous scraping already running');
    return;
  }

  isRunning = true;
  stopRequested = false;
  const intervalHours = parseInt(process.env.CONTINUOUS_SCRAPE_INTERVAL_HOURS || '0', 10);

  logger.info('Starting continuous scraping job', {
    intervalHours: intervalHours === 0 ? 'immediate (no wait)' : `${intervalHours}h`,
  });

  const runCycle = async () => {
    if (stopRequested) {
      isRunning = false;
      return;
    }

    try {
      logger.info('Continuous scrape: starting full cycle...');
      await runAllScrapersFull();
      logger.info('Continuous scrape: full cycle completed');
    } catch (error) {
      logger.error('Continuous scrape: cycle failed', { error: error.message });
    }

    if (stopRequested) {
      isRunning = false;
      return;
    }

    if (intervalHours > 0) {
      const waitMs = intervalHours * 60 * 60 * 1000;
      logger.info(`Continuous scrape: waiting ${intervalHours}h before next cycle`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    setImmediate(runCycle);
  };

  setImmediate(runCycle);
}

/**
 * Demande l'arrêt du scraping continu (après le cycle en cours)
 */
export function stopContinuousScrapingJob() {
  stopRequested = true;
  logger.info('Continuous scraping: stop requested (will stop after current cycle)');
}

export { isRunning as isContinuousScrapingRunning };
