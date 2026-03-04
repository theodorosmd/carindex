/**
 * Lance tous les scrapers en mode "tout scraper" (sans limite).
 * Utilise des URLs par défaut pour chaque source - pas besoin de configurer d'URLs.
 * Crée des entrées scraper_runs pour le suivi dashboard.
 *
 * Usage: node backend/src/scripts/run-all-scrapers-full.js
 * ou: npm run scrape:all --prefix backend
 */
import dotenv from 'dotenv';
import { runAutoScout24Scraper } from '../services/autoscout24Service.js';
import { runLeBonCoinScraper } from '../services/leboncoinService.js';
import { runMobileDeScraper } from '../services/mobiledeService.js';
import { runGaspedaalScraper } from '../services/gaspedaalService.js';
import { runSubitoScraper } from '../services/subitoService.js';
import { createScraperRun, updateScraperRun } from '../services/ingestRunsService.js';
import { DEFAULT_SCRAPER_URLS } from '../config/defaultScraperUrls.js';
import { logger } from '../utils/logger.js';

dotenv.config();

// maxPages élevé pour scraper jusqu'à épuisement (les scrapers s'arrêtent naturellement quand page vide)
const UNLIMITED_OPTIONS = {
  resultLimitPerThread: 10000,
  maxResults: undefined,
  maxPages: 9999
};

// Retries on transient failures (timeout, network, rate limit). 2 = 1 initial + 2 retries = 3 attempts
const SCRAPER_RETRIES = Math.max(1, parseInt(process.env.SCRAPER_RETRIES || '3', 10));
const RETRY_DELAY_MS = parseInt(process.env.SCRAPER_RETRY_DELAY_MS || '15000', 10);

async function runSourceScraper(source, searchUrls) {
  const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];
  const opts = {
    resultLimitPerThread: UNLIMITED_OPTIONS.resultLimitPerThread,
    maxResults: UNLIMITED_OPTIONS.maxResults,
    maxPages: UNLIMITED_OPTIONS.maxPages
  };

  switch (source) {
    case 'autoscout24':
      return runAutoScout24Scraper(urls, opts);
    case 'mobile.de':
      return runMobileDeScraper(urls, opts);
    case 'leboncoin':
      return runLeBonCoinScraper(urls, opts);
    case 'gaspedaal':
      return runGaspedaalScraper(urls, opts);
    case 'marktplaats': {
      const { runMarktplaatsScraper } = await import('../services/marktplaatsService.js');
      return runMarktplaatsScraper(urls, { maxPages: opts.maxPages });
    }
    case 'subito':
      return runSubitoScraper(urls, opts);
    case 'blocket': {
      const { runBlocketScraper } = await import('../services/blocketService.js');
      return runBlocketScraper(urls, opts);
    }
    case 'bilweb': {
      const { runBilwebScraper } = await import('../services/bilwebService.js');
      return runBilwebScraper(urls, opts);
    }
    case 'bytbil': {
      const { runBytbilScraper } = await import('../services/bytbilService.js');
      return runBytbilScraper(urls, opts);
    }
    case 'largus': {
      const { runLargusScraper } = await import('../services/largusService.js');
      return runLargusScraper(urls, { maxPages: opts.maxPages });
    }
    case 'lacentrale': {
      const { runLaCentraleScraper } = await import('../services/laCentraleService.js');
      return runLaCentraleScraper(urls, { maxPages: opts.maxPages });
    }
    case 'coches.net': {
      const { runCochesNetScraper } = await import('../services/cochesnetService.js');
      return runCochesNetScraper(urls, { maxPages: opts.maxPages });
    }
    case 'finn': {
      const { runFinnScraper } = await import('../services/finnService.js');
      return runFinnScraper(urls, { maxPages: opts.maxPages });
    }
    case 'otomoto': {
      const { runOtomotoScraper } = await import('../services/otomotoService.js');
      return runOtomotoScraper(urls, { maxPages: opts.maxPages });
    }
    case '2ememain': {
      const { run2ememainScraper } = await import('../services/deuxememainService.js');
      return run2ememainScraper(urls, { maxPages: opts.maxPages });
    }
    default:
      throw new Error(`Source non supportée: ${source}`);
  }
}

const SOURCE_LABELS = {
  autoscout24: 'AutoScout24',
  'mobile.de': 'mobile.de',
  leboncoin: 'LeBonCoin',
  largus: "L'Argus",
  lacentrale: 'La Centrale',
  gaspedaal: 'Gaspedaal',
  marktplaats: 'Marktplaats',
  subito: 'Subito.it',
  'coches.net': 'coches.net',
  blocket: 'Blocket',
  bilweb: 'Bilweb',
  bytbil: 'Bytbil',
  finn: 'FINN.no',
  otomoto: 'OtoMoto.pl',
  '2ememain': '2emain.be'
};

/** Errors that are worth retrying (transient) */
function isRetryableError(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('network') ||
    msg.includes('429') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('navigation') ||
    msg.includes('target closed') ||
    msg.includes('browser') ||
    msg.includes('chromium') ||
    msg.includes('libglib')
  );
}

/**
 * Run a single source scraper with run tracking and retries
 */
async function runOneSource([source, searchUrls], index, total) {
  const label = SOURCE_LABELS[source] || source;
  let runId = null;
  let lastError = null;

  console.log(`[${index + 1}/${total}] 🏃 Démarrage ${label}...`);

  try {
    const run = await createScraperRun({
      source_platform: source,
      status: 'running'
    });
    runId = run?.id || null;
  } catch (runErr) {
    logger.warn('Could not create scraper run (table may be missing)', { error: runErr.message });
  }

  for (let attempt = 1; attempt <= SCRAPER_RETRIES; attempt++) {
    try {
      const result = await runSourceScraper(source, searchUrls);
      const scraped = result?.totalScraped || 0;
      const saved = result?.saved || 0;

      if (runId) {
        try {
          await updateScraperRun(runId, {
            status: 'success',
            total_scraped: scraped,
            total_saved: saved,
            total_failed: result?.errors || 0
          });
        } catch (upErr) {
          logger.warn('Could not update scraper run', { error: upErr.message });
        }
      }

      console.log(`   ✅ ${label}: ${scraped} scrapées, ${saved} sauvegardées`);
      return { name: label, source, scraped, saved, status: 'success' };
    } catch (err) {
      lastError = err;
      if (attempt < SCRAPER_RETRIES && isRetryableError(err)) {
        console.log(`   ⏳ ${label}: échec, retry ${attempt}/${SCRAPER_RETRIES} dans ${RETRY_DELAY_MS / 1000}s`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        break;
      }
    }
  }

  if (runId) {
    try {
      await updateScraperRun(runId, {
        status: 'failed',
        error_message: lastError?.message || 'Unknown error'
      });
    } catch (upErr) {
      logger.warn('Could not update scraper run', { error: upErr.message });
    }
  }
  logger.error('Scraper failed', { name: label, source, error: lastError?.message });
  console.log(`   ❌ ${label}: ${lastError?.message}`);
  return { name: label, source, scraped: 0, saved: 0, status: 'error', error: lastError?.message };
}

/**
 * Run tasks in parallel with concurrency limit
 */
async function runInBatches(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((item, j) => fn(item, i + j, items.length))
    );
    results.push(...batchResults);
  }
  return results;
}

// Sources ciblées (blocket, leboncoin, autoscout24, largus, lacentrale, mobile.de). FOCUSED_SOURCES=all pour toutes.
const FOCUSED_SOURCES_DEFAULT = 'blocket,leboncoin,autoscout24,largus,lacentrale,mobile.de';

async function runAllScrapersFull() {
  try {
    const concurrency = Math.max(1, parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10));
    const focusEnv = process.env.FOCUSED_SOURCES || FOCUSED_SOURCES_DEFAULT;
    const runAll = focusEnv.toLowerCase() === 'all';
    const sources = runAll
      ? Object.entries(DEFAULT_SCRAPER_URLS)
      : Object.entries(DEFAULT_SCRAPER_URLS).filter(([k]) =>
          focusEnv.split(',').map((s) => s.trim()).includes(k)
        );
    console.log('🚀 Lancement des scrapers en mode complet (sans limite)...');
    console.log(`   Sources: ${runAll ? 'toutes' : sources.map(([k]) => SOURCE_LABELS[k] || k).join(', ')}`);
    console.log(`   Parallélisme: ${concurrency} scrapers en même temps\n`);

    if (sources.length === 0) {
      console.log('   ⚠️ Aucune source à scraper (vérifiez FOCUSED_SOURCES)');
      return;
    }
    const results = await runInBatches(sources, concurrency, runOneSource);

    const totalScraped = results.reduce((s, r) => s + (r.scraped || 0), 0);
    const totalSaved = results.reduce((s, r) => s + (r.saved || 0), 0);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSUMÉ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    results.forEach((r) => {
      const icon = r.status === 'success' ? '✅' : '❌';
      console.log(`   ${icon} ${r.name}: ${r.scraped} scrapées, ${r.saved} sauvegardées${r.error ? ` - ${r.error}` : ''}`);
    });

    console.log(`\n   TOTAL: ${totalScraped} annonces scrapées, ${totalSaved} sauvegardées`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    logger.error('runAllScrapersFull failed', { error: error.message, stack: error.stack });
    // En mode CLI (script direct) : exit pour signaler l'échec
    // En mode importé (scraping continu) : rethrow pour que le job continue la boucle
    if (process.argv[1]?.includes('run-all-scrapers-full')) {
      process.exit(1);
    }
    throw error;
  }
}

// Exécution directe : node run-all-scrapers-full.js
if (process.argv[1]?.includes('run-all-scrapers-full')) {
  runAllScrapersFull();
}

export { runAllScrapersFull };
