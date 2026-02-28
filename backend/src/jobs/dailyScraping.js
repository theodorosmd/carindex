import cron from 'node-cron';
import { getEnabledAutoScrapers, runAutoScraper } from '../services/autoScraperService.js';
import { logger } from '../utils/logger.js';
import { processNewRun } from '../services/scrapers/deltaDetector.js';
import { trackPriceChange } from '../services/priceTracker.js';
import { detectSales } from '../services/saleDetector.js';
import { sendPriceDropNotifications } from '../services/priceDropAlertService.js';
import { sendEmail } from '../services/emailService.js';

/**
 * Daily scraping job that runs at 6 AM
 * Scrapes all enabled sources, detects changes, and sends admin summary
 */
export function startDailyScrapingJob() {
  logger.info('Starting daily scraping job (runs at 6:00 AM)');

  // Schedule job to run every day at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    logger.info('Daily scraping job started');
    await runDailyScraping();
  }, {
    scheduled: true,
    timezone: 'Europe/Paris'
  });

  logger.info('Daily scraping job scheduled successfully');
}

/**
 * Execute daily scraping
 */
export async function runDailyScraping() {
  const startTime = Date.now();
  const results = {
    scrapers: [],
    totalNewListings: 0,
    totalPriceChanges: 0,
    totalSales: 0,
    errors: []
  };

  try {
    // Get all enabled scrapers
    const scrapers = await getEnabledAutoScrapers();
    logger.info(`Found ${scrapers.length} enabled scrapers for daily run`);

    if (scrapers.length === 0) {
      logger.warn('No enabled scrapers found for daily run');
      return results;
    }

    // Run each scraper sequentially with short delay to avoid memory overload
    const DELAY_BETWEEN_SCRAPERS_MS = 45 * 1000; // 45 sec between each
    for (let i = 0; i < scrapers.length; i++) {
      const scraper = scrapers[i];
      if (i > 0) {
        logger.info(`Waiting ${DELAY_BETWEEN_SCRAPERS_MS / 1000}s before next scraper...`);
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_SCRAPERS_MS));
      }
      try {
        logger.info(`Running daily scraper ${i + 1}/${scrapers.length}: ${scraper.name} (${scraper.source})`);

        // Run the scraper
        const scraperResult = await runAutoScraper(scraper);

        // Process results with delta detection
        // Note: This assumes the scraper saves listings to DB
        // We would need to fetch the newly scraped listings and compare
        // For now, we'll just log the run
        results.scrapers.push({
          id: scraper.id,
          name: scraper.name,
          source: scraper.source,
          status: scraperResult?.status || 'completed',
          listingsScraped: scraperResult?.totalScraped || 0
        });

        logger.info(`Scraper ${scraper.name} completed`, {
          listingsScraped: scraperResult?.totalScraped || 0
        });
      } catch (error) {
        logger.error(`Error running scraper ${scraper.name}`, {
          error: error.message,
          scraperId: scraper.id
        });
        results.scrapers.push({
          id: scraper.id,
          name: scraper.name,
          source: scraper.source,
          status: 'error',
          listingsScraped: 0
        });
        results.errors.push({
          scraperId: scraper.id,
          scraperName: scraper.name,
          error: error.message
        });
      }
    }

    // Send admin summary email
    const duration = Math.round((Date.now() - startTime) / 1000);
    await sendAdminSummary(results, duration);

    logger.info('Daily scraping job completed', {
      duration: `${duration}s`,
      scrapersRun: results.scrapers.length,
      errors: results.errors.length
    });

    return results;
  } catch (error) {
    logger.error('Error in daily scraping job', {
      error: error.message,
      stack: error.stack
    });
    results.errors.push({
      type: 'global',
      error: error.message
    });
    throw error;
  }
}

/**
 * Send admin summary email
 */
async function sendAdminSummary(results, duration) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

    if (!adminEmail) {
      logger.warn('No admin email configured, skipping summary email');
      return;
    }

    const scrapersList = results.scrapers.map(s => `
      <li>
        <strong>${s.name}</strong> (${s.source}): 
        ${s.listingsScraped || 0} annonces scrapées - 
        <span style="color: ${s.status === 'completed' ? 'green' : 'orange'}">${s.status}</span>
      </li>
    `).join('');

    const errorsList = results.errors.length > 0
      ? results.errors.map(e => `<li><strong>${e.scraperName || 'Global'}</strong>: ${e.error}</li>`).join('')
      : '<li>Aucune erreur</li>';

    const emailSubject = `Rapport quotidien Carindex - ${new Date().toLocaleDateString('fr-FR')}`;
    const emailBody = `
      <h2>Rapport quotidien de scraping</h2>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Durée:</strong> ${duration} secondes</p>
      
      <h3>Résultats par scraper</h3>
      <ul>
        ${scrapersList}
      </ul>
      
      <h3>Erreurs</h3>
      <ul>
        ${errorsList}
      </ul>
      
      <h3>Statistiques globales</h3>
      <ul>
        <li>Nouvelles annonces: ${results.totalNewListings}</li>
        <li>Changements de prix: ${results.totalPriceChanges}</li>
        <li>Annonces vendues: ${results.totalSales}</li>
      </ul>
    `;

    await sendEmail(adminEmail, emailSubject, emailBody);
    logger.info('Admin summary email sent', { adminEmail });
  } catch (error) {
    logger.error('Error sending admin summary email', { error: error.message });
    // Don't throw - email failure shouldn't break the job
  }
}

/**
 * Stop daily scraping job
 */
export function stopDailyScrapingJob() {
  logger.info('Stopping daily scraping job');
  // Note: In a real implementation, we'd store the cron job reference
  // and call .stop() on it. For now, this is a placeholder.
}
