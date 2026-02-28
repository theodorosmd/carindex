/**
 * Service to detect disappeared listings after a scrape run and mark them as sold.
 * Reduces broken "View original listing" links by marking listings sold immediately
 * when they disappear from the source, instead of waiting for the 7-day sales job.
 */
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { detectDelta } from './scrapers/deltaDetector.js';
import { detectSales } from './saleDetector.js';

/** Map scraper source variants to raw_listings source_platform */
const SOURCE_TO_CANONICAL = {
  'largus.fr': 'largus',
  argus: 'largus',
  'subito.it': 'subito',
  'lacentrale.fr': 'lacentrale',
  cochesnet: 'coches.net',
  'gaspedaal.nl': 'gaspedaal',
  'marktplaats.nl': 'marktplaats',
  deuxememain: '2ememain',
  'finn.no': 'finn',
  'otomoto.pl': 'otomoto',
  automoto: 'otomoto'
};

function toCanonicalSource(source) {
  return SOURCE_TO_CANONICAL[source] || source;
}

/**
 * Get source_listing_ids from raw_listings scraped since the given time.
 * Used to build "current" set for delta detection.
 *
 * @param {string} sourcePlatform - e.g. 'autoscout24', 'mobile.de'
 * @param {Date|string} since - Minimum scraped_at (run start time minus buffer)
 * @returns {Promise<Array<{ source_listing_id: string }>>}
 */
export async function getCurrentSourceIdsFromRaw(sourcePlatform, since) {
  const sinceIso = typeof since === 'string' ? since : (since instanceof Date ? since.toISOString() : new Date(since).toISOString());
  const { data, error } = await supabase
    .from('raw_listings')
    .select('source_listing_id')
    .eq('source_platform', sourcePlatform)
    .gte('scraped_at', sinceIso);

  if (error) {
    logger.warn('Failed to fetch current source IDs from raw_listings', { sourcePlatform, error: error.message });
    return [];
  }

  const seen = new Set();
  const result = [];
  for (const row of data || []) {
    const id = row.source_listing_id ? String(row.source_listing_id) : null;
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push({ source_listing_id: id });
    }
  }
  return result;
}

/**
 * After a scraper run completes, detect disappeared listings and mark them as sold.
 * Call this from runAutoScraper after a successful run.
 *
 * @param {string} runId - Scraper run ID
 * @param {string} source - Source platform (e.g. 'autoscout24', 'mobile.de')
 * @param {Date|string} runStartedAt - When the run started
 * @returns {{ markedAsSold: number, errors: number }}
 */
export async function markDisappearedAsSold(runId, source, runStartedAt) {
  try {
    const canonicalSource = toCanonicalSource(source);
    const since = new Date(runStartedAt);
    since.setMinutes(since.getMinutes() - 2); // 2-min buffer for clock skew

    const currentListings = await getCurrentSourceIdsFromRaw(canonicalSource, since);
    if (currentListings.length === 0) {
      logger.debug('No current listings from raw_listings, skipping delta sale marking', { source: canonicalSource });
      return { markedAsSold: 0, errors: 0 };
    }

    const delta = await detectDelta(runId, canonicalSource, currentListings);
    if (!delta.disappearedListings || delta.disappearedListings.length === 0) {
      return { markedAsSold: 0, errors: 0 };
    }

    logger.info('Marking disappeared listings as sold', {
      source: canonicalSource,
      count: delta.disappearedListings.length,
      ids: delta.disappearedListings.slice(0, 5).map((d) => d.sourceListingId)
    });

    const result = await detectSales(delta.disappearedListings);
    return {
      markedAsSold: result.markedAsSold?.length ?? 0,
      errors: result.errors?.length ?? 0
    };
  } catch (error) {
    logger.error('Failed to mark disappeared listings as sold', { source: source || 'unknown', error: error.message });
    return { markedAsSold: 0, errors: 1 };
  }
}
