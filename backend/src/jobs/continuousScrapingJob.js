/**
 * Scraping continu H24 — une boucle infinie indépendante par source.
 *
 * Chaque scraper tourne dans sa propre boucle : dès qu'un cycle est terminé
 * (ou qu'il dépasse son timeout de sécurité), il repart immédiatement.
 * Plus aucune source lente ne peut bloquer les autres.
 *
 * Env:
 *   ENABLE_CONTINUOUS_SCRAPING=true
 *   ACTIVE_SOURCES=all|source1,source2,...    défaut: toutes les sources connues
 *   LOOP_PAUSE_MS=5000                        pause (ms) entre deux cycles d'une même source
 *
 * Timeouts de sécurité par source (annule le cycle si dépassé) :
 *   FINN_TIMEOUT_MS=900000        défaut  15 min
 *   OTOMOTO_TIMEOUT_MS=3600000    défaut  60 min
 *   DEUXEMEMAIN_TIMEOUT_MS=1800000 défaut 30 min
 *   SOURCE_TIMEOUT_MS=0           timeout global (0 = désactivé)
 */

import { runOneSource } from '../scripts/run-all-scrapers-full.js';
import { DEFAULT_SCRAPER_URLS } from '../config/defaultScraperUrls.js';
import { logger } from '../utils/logger.js';

let stopRequested = false;
let activeLoopCount = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Timeouts de sécurité (évite qu'un scraper bloqué tourne indéfiniment) ───

const DEFAULT_SOURCE_TIMEOUTS_MS = {
  finn:       parseInt(process.env.FINN_TIMEOUT_MS        || String(15 * 60 * 1000), 10),
  otomoto:    parseInt(process.env.OTOMOTO_TIMEOUT_MS     || String(60 * 60 * 1000), 10),
  '2ememain': parseInt(process.env.DEUXEMEMAIN_TIMEOUT_MS || String(30 * 60 * 1000), 10),
};

const GLOBAL_TIMEOUT_MS = parseInt(process.env.SOURCE_TIMEOUT_MS || '0', 10);
const LOOP_PAUSE_MS     = parseInt(process.env.LOOP_PAUSE_MS || '5000', 10);

function getTimeoutMs(source) {
  if (DEFAULT_SOURCE_TIMEOUTS_MS[source]) return DEFAULT_SOURCE_TIMEOUTS_MS[source];
  return GLOBAL_TIMEOUT_MS > 0 ? GLOBAL_TIMEOUT_MS : 0;
}

// ─── Boucle indépendante pour une source ─────────────────────────────────────

async function runSourceLoop(source) {
  const urls = DEFAULT_SCRAPER_URLS[source];
  if (!urls) {
    logger.warn(`[continuous] Source inconnue ignorée: ${source}`);
    return;
  }

  activeLoopCount++;
  logger.info(`[continuous] ▶ Démarrage boucle: ${source}`);

  while (!stopRequested) {
    const timeoutMs = getTimeoutMs(source);

    try {
      if (timeoutMs > 0) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`timeout (${Math.round(timeoutMs / 60000)}min)`)),
            timeoutMs
          )
        );
        await Promise.race([runOneSource([source, urls], 0, 1), timeoutPromise]);
      } else {
        await runOneSource([source, urls], 0, 1);
      }
    } catch (err) {
      logger.error(`[continuous] ✗ Erreur boucle ${source}: ${err.message}`);
      // Pause de récupération après erreur (évite les boucles d'erreur rapides)
      await sleep(30_000);
    }

    if (!stopRequested && LOOP_PAUSE_MS > 0) {
      await sleep(LOOP_PAUSE_MS);
    }
  }

  activeLoopCount--;
  logger.info(`[continuous] ■ Boucle arrêtée: ${source}`);
}

// ─── API publique ─────────────────────────────────────────────────────────────

export function startContinuousScrapingJob() {
  if (activeLoopCount > 0) {
    logger.warn('[continuous] Scraping déjà en cours, skip');
    return;
  }

  stopRequested = false;

  // Déterminer les sources actives
  const activeEnv = process.env.ACTIVE_SOURCES;
  let sources;

  if (!activeEnv || activeEnv.toLowerCase() === 'all') {
    sources = Object.keys(DEFAULT_SCRAPER_URLS);
  } else {
    sources = activeEnv.split(',').map((s) => s.trim()).filter(Boolean);
  }

  logger.info('[continuous] Démarrage H24 — boucle indépendante par source', {
    sources,
    loopPauseMs: LOOP_PAUSE_MS,
    timeouts: Object.fromEntries(
      sources
        .map((s) => [s, getTimeoutMs(s)])
        .filter(([, t]) => t > 0)
    ),
  });

  // Une boucle indépendante par source, toutes démarrent immédiatement
  for (const source of sources) {
    setImmediate(() => runSourceLoop(source));
  }
}

export function stopContinuousScrapingJob() {
  stopRequested = true;
  logger.info('[continuous] Arrêt demandé (les cycles en cours se terminent)');
}

export { activeLoopCount as isContinuousScrapingRunning };
