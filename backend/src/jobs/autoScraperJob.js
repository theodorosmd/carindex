import cron from 'node-cron';
import { getEnabledAutoScrapers, runAutoScraper } from '../services/autoScraperService.js';
import { logger } from '../utils/logger.js';

// Store active cron jobs
const activeCronJobs = new Map();

/**
 * Start auto scraper cron jobs
 */
export function startAutoScraperJobs() {
  logger.info('Starting auto scraper jobs...');

  // Load all enabled scrapers and schedule them
  loadAndScheduleScrapers();

  // Also reload scrapers every hour (in case new ones are added)
  cron.schedule('0 * * * *', async () => {
    logger.info('Reloading auto scraper configurations...');
    loadAndScheduleScrapers();
  });

  logger.info('Auto scraper jobs started successfully');
}

/**
 * Load enabled scrapers and schedule them
 */
async function loadAndScheduleScrapers() {
  try {
    const scrapers = await getEnabledAutoScrapers();
    logger.info(`Found ${scrapers.length} enabled auto scrapers`);

    // Stop all existing cron jobs
    activeCronJobs.forEach((job, id) => {
      job.stop();
      activeCronJobs.delete(id);
    });

    // Schedule each scraper
    for (const scraper of scrapers) {
      try {
        const job = cron.schedule(scraper.schedule_cron, async () => {
          logger.info(`Running scheduled scraper: ${scraper.name} (${scraper.source})`);
          try {
            await runAutoScraper(scraper);
          } catch (error) {
            logger.error(`Error in scheduled scraper ${scraper.name}`, {
              error: error.message,
              scraperId: scraper.id
            });
          }
        }, {
          scheduled: true,
          timezone: 'Europe/Paris'
        });

        activeCronJobs.set(scraper.id, job);
        logger.info(`Scheduled scraper: ${scraper.name} with cron: ${scraper.schedule_cron}`);
      } catch (error) {
        logger.error(`Error scheduling scraper ${scraper.name}`, {
          error: error.message,
          scraperId: scraper.id,
          cron: scraper.schedule_cron
        });
      }
    }
  } catch (error) {
    logger.error('Error loading and scheduling scrapers', { error: error.message });
  }
}

/**
 * Stop all auto scraper jobs
 */
export function stopAutoScraperJobs() {
  logger.info('Stopping auto scraper jobs...');
  activeCronJobs.forEach((job, id) => {
    job.stop();
  });
  activeCronJobs.clear();
  logger.info('Auto scraper jobs stopped');
}

/**
 * Reload scrapers (useful when configuration changes)
 */
export async function reloadAutoScrapers() {
  logger.info('Reloading auto scraper configurations...');
  loadAndScheduleScrapers();
}







