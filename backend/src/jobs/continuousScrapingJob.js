/**
 * Scraping continu H24 avec boucles indépendantes par source.
 *
 * Les sources "prioritaires" (mobile.de, leboncoin, autoscout24 par défaut)
 * tournent chacune dans leur propre boucle infinie : dès qu'un cycle est
 * terminé, la source repart immédiatement sans attendre les autres.
 *
 * Les sources secondaires tournent en batches séquentiels (comportement
 * d'origine) mais ne bloquent plus jamais les sources prioritaires.
 *
 * Env:
 *   ENABLE_CONTINUOUS_SCRAPING=true
 *   PRIORITY_SOURCES=mobile.de,leboncoin,autoscout24   (sources à boucle indépendante)
 *   SECONDARY_SOURCES=all|source1,source2,...           (défaut: tout le reste)
 *   LOOP_PAUSE_MS=5000                                  (pause entre deux cycles d'une même source)
 *   SCRAPE_CONCURRENCY=3                                (parallélisme batch sources secondaires)
 *   CONTINUOUS_SCRAPE_INTERVAL_HOURS=0                  (pause entre deux cycles batch secondaires)
 */

import { runOneSource, runInBatches } from '../scripts/run-all-scrapers-full.js';
import { DEFAULT_SCRAPER_URLS } from '../config/defaultScraperUrls.js';
import { logger } from '../utils/logger.js';

let stopRequested = false;
let activeLoopCount = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Configuration ────────────────────────────────────────────────────────────

const PRIORITY_SOURCES = (process.env.PRIORITY_SOURCES || 'mobile.de,leboncoin,autoscout24')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const LOOP_PAUSE_MS = parseInt(process.env.LOOP_PAUSE_MS || '5000', 10);

// ─── Boucle indépendante pour une source prioritaire ─────────────────────────

async function runSourceLoop(source) {
  const urls = DEFAULT_SCRAPER_URLS[source];
  if (!urls) {
    logger.warn(`[continuous] Source prioritaire inconnue: ${source}`);
    return;
  }

  activeLoopCount++;
  logger.info(`[continuous] Démarrage boucle indépendante: ${source}`);

  while (!stopRequested) {
    try {
      await runOneSource([source, urls], 0, 1);
    } catch (err) {
      logger.error(`[continuous] Erreur boucle ${source}`, { error: err.message });
      // Pause de sécurité sur erreur inattendue
      await sleep(30_000);
    }

    if (!stopRequested && LOOP_PAUSE_MS > 0) {
      await sleep(LOOP_PAUSE_MS);
    }
  }

  activeLoopCount--;
  logger.info(`[continuous] Boucle arrêtée: ${source}`);
}

// ─── Boucle batch pour les sources secondaires ───────────────────────────────

async function runBatchLoop(secondarySources) {
  if (secondarySources.length === 0) return;

  const concurrency = Math.max(1, parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10));
  const intervalHours = parseInt(process.env.CONTINUOUS_SCRAPE_INTERVAL_HOURS || '0', 10);
  const items = secondarySources
    .map((source) => [source, DEFAULT_SCRAPER_URLS[source]])
    .filter(([, urls]) => !!urls);

  if (items.length === 0) return;

  activeLoopCount++;
  logger.info(`[continuous] Démarrage boucle batch (${concurrency} en parallèle): ${secondarySources.join(', ')}`);

  while (!stopRequested) {
    try {
      logger.info('[continuous] Batch secondaire: début du cycle');
      await runInBatches(items, concurrency, runOneSource);
      logger.info('[continuous] Batch secondaire: cycle terminé');
    } catch (err) {
      logger.error('[continuous] Erreur boucle batch', { error: err.message });
    }

    if (!stopRequested) {
      if (intervalHours > 0) {
        logger.info(`[continuous] Batch secondaire: pause ${intervalHours}h`);
        await sleep(intervalHours * 60 * 60 * 1000);
      } else {
        await sleep(LOOP_PAUSE_MS);
      }
    }
  }

  activeLoopCount--;
  logger.info('[continuous] Boucle batch secondaire arrêtée');
}

// ─── API publique ─────────────────────────────────────────────────────────────

export function startContinuousScrapingJob() {
  if (activeLoopCount > 0) {
    logger.warn('[continuous] Scraping déjà en cours, skip');
    return;
  }

  stopRequested = false;

  // Sources secondaires = tout ce qui n'est pas prioritaire
  const secondaryEnv = process.env.SECONDARY_SOURCES;
  let secondarySources;

  if (secondaryEnv && secondaryEnv.toLowerCase() !== 'all') {
    secondarySources = secondaryEnv.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    secondarySources = Object.keys(DEFAULT_SCRAPER_URLS).filter(
      (s) => !PRIORITY_SOURCES.includes(s)
    );
  }

  logger.info('[continuous] Démarrage H24', {
    prioritySources: PRIORITY_SOURCES,
    secondarySources,
    loopPauseMs: LOOP_PAUSE_MS,
  });

  // Lancer une boucle indépendante pour chaque source prioritaire
  for (const source of PRIORITY_SOURCES) {
    setImmediate(() => runSourceLoop(source));
  }

  // Lancer la boucle batch pour les sources secondaires
  setImmediate(() => runBatchLoop(secondarySources));
}

export function stopContinuousScrapingJob() {
  stopRequested = true;
  logger.info('[continuous] Arrêt demandé (en cours de cycle)');
}

export { activeLoopCount as isContinuousScrapingRunning };
