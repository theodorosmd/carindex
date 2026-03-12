/**
 * Backfill mobile_de listing specs by fetching detail pages from mobile.de
 *
 * Problem: The mobile.de scraper only reads search page data (brand/model/year/price/mileage).
 * It never fetches detail pages, so power_hp, color, fuel_type, doors, displacement,
 * drivetrain, description are all NULL for ~99% of mobile_de listings.
 *
 * This script:
 * 1. Selects mobile_de listings where power_hp IS NULL (by batch)
 * 2. Extracts numeric ID from source_listing_id (URL or numeric)
 * 3. Fetches https://suchen.mobile.de/fahrzeuge/details.html?id=XXX via scrape.do (render=false)
 * 4. Parses __INITIAL_STATE__ JSON + HTML fallback for specs
 * 5. UPDATEs the listing with extracted specs
 *
 * Cost estimate: ~155K listings × $0.001/req (scrape.do render=false) = ~$155
 * Speed: 3 req/s → ~15 hours for full run (run nightly or as background job)
 *
 * Run from backend/ dir:
 *   node src/scripts/enrichMobileDeDetails.js
 *   node src/scripts/enrichMobileDeDetails.js --limit 1000 --concurrency 3
 */

import { supabase } from '../config/supabase.js';
import { fetchViaScrapeDo } from '../utils/scrapeDo.js';
import { logger } from '../utils/logger.js';
import * as cheerio from 'cheerio';

const PAGE_SIZE = parseInt(process.env.ENRICH_PAGE_SIZE || '200', 10);
const CONCURRENCY = parseInt(process.env.ENRICH_CONCURRENCY || '3', 10);
const DELAY_MS = parseInt(process.env.ENRICH_DELAY_MS || '350', 10);
const LIMIT = process.env.ENRICH_LIMIT ? parseInt(process.env.ENRICH_LIMIT, 10) : null;

// ── Parser: extract vehicle specs from mobile.de detail page HTML ─────────────

/**
 * Try to extract specs from window.__INITIAL_STATE__ JSON.
 * mobile.de detail pages embed full vehicle data server-side.
 */
function parseFromInitialState(html) {
  const idx = html.indexOf('window.__INITIAL_STATE__');
  if (idx === -1) return null;

  const start = html.indexOf('=', idx) + 1;
  const end = html.indexOf('window.__PUBLIC_CONFIG__', start);
  const jsonStr = (end > start ? html.slice(start, end) : html.slice(start))
    .trim().replace(/;\s*$/, '');
  if (!jsonStr || jsonStr.length < 100) return null;

  try {
    const state = JSON.parse(jsonStr);

    // Try multiple known paths for vehicle data in different mobile.de versions
    const vehicle = (
      state?.vehicleDetails?.vehicle ||
      state?.ad?.vehicle ||
      state?.listing?.vehicle ||
      state?.page?.vehicle ||
      state?.detail?.vehicle ||
      // Older format
      state?.carDetail?.car ||
      state?.search?.srp?.data?.selectedVehicle ||
      null
    );

    const attrs = vehicle?.attributes || vehicle?.attrs || vehicle || {};
    const tech = attrs?.technicalData || attrs?.tech || attrs;

    // Extract specs — mobile.de uses German field names in their JSON
    const result = {};

    // Power: PS (German for HP) or kW
    const ps = parseInt(tech?.leistung || tech?.ps || tech?.power || attrs?.ps || attrs?.leistung, 10);
    const kw = parseInt(tech?.kw || attrs?.kw, 10);
    if (!isNaN(ps) && ps > 0) result.power_hp = ps;
    else if (!isNaN(kw) && kw > 0) result.power_hp = Math.round(kw * 1.341);

    // Fuel type
    const fuelRaw = (tech?.kraftstoff || attrs?.kraftstoff || attrs?.fuel || attrs?.fuelType || '').toLowerCase();
    if (fuelRaw) {
      const fuelMap = { diesel: 'DIESEL', benzin: 'PETROL', petrol: 'PETROL', elektro: 'ELECTRIC',
        electric: 'ELECTRIC', hybrid: 'HYBRID', lpg: 'LPG', 'plug-in-hybrid': 'HYBRID',
        'mild-hybrid': 'HYBRID', wasserstoff: 'HYDROGEN', erdgas: 'CNG' };
      result.fuel_type = fuelMap[fuelRaw] || fuelRaw.toUpperCase();
    }

    // Color
    const colorRaw = tech?.farbe || attrs?.farbe || attrs?.color || attrs?.colour;
    if (colorRaw) result.color = String(colorRaw).toLowerCase();

    // Doors
    const doors = parseInt(tech?.tueren || attrs?.tueren || attrs?.doors || attrs?.numberOfDoors, 10);
    if (!isNaN(doors) && doors > 0 && doors <= 10) result.doors = doors;

    // Displacement (in cc or L)
    const hubraum = tech?.hubraum || attrs?.hubraum || attrs?.displacement || attrs?.engineSize;
    if (hubraum) {
      const val = parseFloat(String(hubraum).replace(/[^\d.]/g, ''));
      if (!isNaN(val) && val > 0) {
        // If value looks like liters (< 20), convert to cc
        result.displacement = val < 20 ? Math.round(val * 1000) : Math.round(val);
      }
    }

    // Transmission
    const getriebeRaw = (tech?.getriebe || attrs?.getriebe || attrs?.transmission || '').toLowerCase();
    if (getriebeRaw) {
      if (getriebeRaw.includes('automatik') || getriebeRaw.includes('automatic') || getriebeRaw.includes('dsg')) {
        result.transmission = 'AUTOMATIC';
      } else if (getriebeRaw.includes('schalt') || getriebeRaw.includes('manual')) {
        result.transmission = 'MANUAL';
      }
    }

    // Drivetrain
    const antriebRaw = (tech?.antrieb || attrs?.antrieb || attrs?.drivetrain || '').toLowerCase();
    if (antriebRaw) {
      if (antriebRaw.includes('allrad') || antriebRaw.includes('4x4') || antriebRaw.includes('awd')) {
        result.drivetrain = 'awd';
      } else if (antriebRaw.includes('front') || antriebRaw.includes('vorder')) {
        result.drivetrain = 'fwd';
      } else if (antriebRaw.includes('hinter') || antriebRaw.includes('rear') || antriebRaw.includes('rwd')) {
        result.drivetrain = 'rwd';
      }
    }

    // Description / Freitext
    const desc = vehicle?.description || vehicle?.freitext || vehicle?.text || attrs?.freitext;
    if (desc && typeof desc === 'string' && desc.length > 10) result.description = desc;

    // Category
    const catRaw = (vehicle?.category || vehicle?.aufbau || attrs?.aufbau || attrs?.category || '').toLowerCase();
    if (catRaw) {
      const catMap = { limousine: 'sedan', kombi: 'estate', 'station wagon': 'estate',
        suv: 'suv', cabrio: 'convertible', cabriolet: 'convertible', coupe: 'coupe',
        coupé: 'coupe', kleinwagen: 'hatchback', van: 'van', minivan: 'van',
        pick: 'pickup', transporter: 'van' };
      for (const [key, val] of Object.entries(catMap)) {
        if (catRaw.includes(key)) { result.category = val; break; }
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (e) {
    return null;
  }
}

/**
 * Fallback: parse specs from HTML directly using cheerio.
 * mobile.de renders spec tables with labeled rows.
 */
function parseFromHtml(html) {
  const $ = cheerio.load(html);
  const result = {};

  // Try JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const ld = JSON.parse($(el).html() || '');
      if (ld?.vehicleEngine?.enginePower?.value) {
        const hp = parseFloat(ld.vehicleEngine.enginePower.value);
        if (!isNaN(hp)) result.power_hp = Math.round(hp);
      }
      if (ld?.fuelType) result.fuel_type = String(ld.fuelType).toUpperCase();
      if (ld?.color) result.color = String(ld.color).toLowerCase();
      if (ld?.numberOfDoors) result.doors = parseInt(ld.numberOfDoors, 10) || null;
      if (ld?.description) result.description = ld.description;
    } catch {}
  });

  // Spec rows: <dt>Leistung</dt><dd>150 PS</dd>
  $('dl dt, [class*="spec"] [class*="label"], [class*="attribute"] [class*="key"]').each((_, el) => {
    const label = $(el).text().toLowerCase().trim();
    const valueEl = $(el).next('dd, [class*="value"]');
    const value = valueEl.text().trim();
    if (!value) return;

    if (label.includes('leistung') || label.includes('ps') || label.includes('power')) {
      const m = value.match(/(\d+)\s*(ps|kw|hp)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        result.power_hp = m[2].toLowerCase() === 'kw' ? Math.round(n * 1.341) : n;
      }
    }
    if (label.includes('kraftstoff') || label.includes('fuel')) {
      const fuelMap = { diesel: 'DIESEL', benzin: 'PETROL', elektro: 'ELECTRIC',
        hybrid: 'HYBRID', lpg: 'LPG', erdgas: 'CNG' };
      const raw = value.toLowerCase();
      for (const [k, v] of Object.entries(fuelMap)) {
        if (raw.includes(k)) { result.fuel_type = v; break; }
      }
    }
    if (label.includes('farbe') || label.includes('color')) {
      result.color = value.toLowerCase();
    }
    if (label.includes('türen') || label.includes('doors')) {
      const d = parseInt(value, 10);
      if (!isNaN(d) && d > 0 && d <= 10) result.doors = d;
    }
    if (label.includes('hubraum') || label.includes('displacement')) {
      const m = value.match(/([\d.,]+)\s*(ccm|cc|l|liter)/i);
      if (m) {
        const n = parseFloat(m[1].replace(',', '.'));
        result.displacement = m[2].toLowerCase().startsWith('l') ? Math.round(n * 1000) : Math.round(n);
      }
    }
    if (label.includes('getriebe') || label.includes('transmission')) {
      if (/automatik|automatic|dsg/i.test(value)) result.transmission = 'AUTOMATIC';
      else if (/schalt|manual/i.test(value)) result.transmission = 'MANUAL';
    }
    if (label.includes('antrieb') || label.includes('drive')) {
      if (/allrad|4x4|awd/i.test(value)) result.drivetrain = 'awd';
      else if (/front|vorder/i.test(value)) result.drivetrain = 'fwd';
      else if (/hinter|rear|rwd/i.test(value)) result.drivetrain = 'rwd';
    }
  });

  // Description
  if (!result.description) {
    const descEl = $('[class*="description"], [class*="freitext"], [class*="remarks"]').first();
    const desc = descEl.text().trim();
    if (desc && desc.length > 20) result.description = desc.slice(0, 2000);
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function fetchAndParseDetail(numericId) {
  const url = `https://suchen.mobile.de/fahrzeuge/details.html?id=${numericId}`;
  let html;
  try {
    // render=false is cheaper and sufficient: __INITIAL_STATE__ is server-side rendered
    // retries: 0 → fail-fast on 410/404 (permanent "Gone") without 25s retry waits
    html = await fetchViaScrapeDo(url, { render: false, geoCode: 'de', superProxy: true, retries: 0 });
  } catch (err) {
    if (err.message?.includes('410') || err.message?.includes('404')) {
      return { gone: true };
    }
    throw err;
  }

  // Try __INITIAL_STATE__ first (richer, structured)
  let specs = parseFromInitialState(html);
  // Fall back to HTML parsing
  if (!specs || Object.keys(specs).length < 2) {
    specs = parseFromHtml(html);
  }

  return specs || {};
}

// ── Main enrichment loop ──────────────────────────────────────────────────────

async function main() {
  logger.info('mobile_de detail enrichment started', { pageSize: PAGE_SIZE, concurrency: CONCURRENCY });

  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalGone = 0;
  let totalErrors = 0;

  while (true) {
    if (LIMIT && totalProcessed >= LIMIT) {
      logger.info('Reached limit', { limit: LIMIT, processed: totalProcessed });
      break;
    }

    // Fetch batch of mobile_de listings missing power_hp
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, source_listing_id, url')
      .eq('source_platform', 'mobile_de')
      .is('power_hp', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      logger.error('DB fetch error', { error: error.message });
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }
    if (!listings || listings.length === 0) {
      logger.info('No more listings to enrich', { totalProcessed, totalUpdated });
      break;
    }

    // Process concurrently
    const chunks = [];
    for (let i = 0; i < listings.length; i += CONCURRENCY) {
      chunks.push(listings.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (listing) => {
        // Extract numeric ID from source_listing_id (URL or numeric)
        const idMatch = listing.source_listing_id?.match(/[?&]id=(\d+)/) ||
                        listing.source_listing_id?.match(/\/details\/(\d+)/) ||
                        listing.source_listing_id?.match(/^(\d+)$/);
        const numericId = idMatch?.[1];

        if (!numericId) {
          logger.debug('Cannot extract numeric ID', { source_listing_id: listing.source_listing_id });
          return;
        }

        try {
          const specs = await fetchAndParseDetail(numericId);
          totalProcessed++;

          if (specs?.gone) {
            // Listing no longer exists on mobile.de — mark or skip
            totalGone++;
            // Optionally: await supabase.from('listings').update({ is_active: false }).eq('id', listing.id);
            return;
          }

          if (Object.keys(specs).length === 0) {
            // Page returned but no specs found
            return;
          }

          // Update listing with extracted specs (only non-null fields)
          const update = {};
          if (specs.power_hp) update.power_hp = specs.power_hp;
          if (specs.fuel_type) update.fuel_type = specs.fuel_type;
          if (specs.color) update.color = specs.color;
          if (specs.doors) update.doors = specs.doors;
          if (specs.displacement) update.displacement = specs.displacement;
          if (specs.transmission) update.transmission = specs.transmission;
          if (specs.drivetrain) update.drivetrain = specs.drivetrain;
          if (specs.description) update.description = specs.description;
          if (specs.category) update.category = specs.category;

          if (Object.keys(update).length > 0) {
            const { error: updateErr } = await supabase
              .from('listings')
              .update(update)
              .eq('id', listing.id);

            if (updateErr) {
              logger.warn('Update failed', { id: listing.id, error: updateErr.message });
            } else {
              totalUpdated++;
            }
          }
        } catch (err) {
          totalErrors++;
          logger.warn('Fetch failed', { id: listing.id, numericId, error: err.message });
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
      }));
    }

    process.stdout.write(`\r  offset=${offset} processed=${totalProcessed} updated=${totalUpdated} gone=${totalGone} errors=${totalErrors}`);

    // Since we're updating power_hp, the same listings won't appear in the next query
    // (they'll be filtered out by .is('power_hp', null))
    // So we DON'T need to increment offset — the next query will naturally return unprocessed ones
    // But if no specs were found for some, offset must advance to avoid infinite loop
    if (totalProcessed === 0 && listings.length === PAGE_SIZE) {
      offset += PAGE_SIZE; // Safety: advance if nothing is being enriched
    }
    // Reset offset when power_hp gets set (listings drop out of query)
  }

  console.log(`\n\nDone!`);
  console.log(`  Processed: ${totalProcessed}`);
  console.log(`  Updated with specs: ${totalUpdated}`);
  console.log(`  Gone/404 on mobile.de: ${totalGone}`);
  console.log(`  Errors: ${totalErrors}`);
}

main().catch(err => {
  logger.error('Fatal error', { error: err.message });
  process.exit(1);
});
