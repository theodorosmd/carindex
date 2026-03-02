#!/usr/bin/env node
/**
 * Fix listings with year = NULL by extracting from existing data or re-fetching the source page.
 *
 * Phase 1: Extract year from specifications, description, URL (no HTTP)
 * Phase 2 (--fetch): Re-fetch detail page for supported sources (bytbil, etc.)
 *
 * Usage:
 *   node src/scripts/fix-null-years.js           # extract from existing data only
 *   node src/scripts/fix-null-years.js --fetch  # also re-fetch pages for supported sources
 *   node src/scripts/fix-null-years.js --fix-2000  # also fix erroneous year=2000 (e.g. from median)
 *   node src/scripts/fix-null-years.js --limit 50  # process max 50 listings
 */

import { supabase } from '../config/supabase.js';
import { fetchBytbilDetailViaScraper } from '../services/bytbilService.js';
import dotenv from 'dotenv';

dotenv.config();

const YEAR_REGEX = /\b(19|20)\d{2}\b/;
const SPEC_KEYS_YEAR = [
  'år', 'year', 'annee', 'année', 'firstregistration', 'first_registration',
  'registrationyear', 'registration_year', 'erstzulassung', 'immatricolazione',
  'anno', 'mise en circulation', 'regdate', 'modelyear', 'model_year'
];

const TAX_LIKE_NUMBERS = new Set([649, 2041, 2042, 2043]); // Årsskatt, fordonsskatt - avoid false positives

function extractYearFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(YEAR_REGEX);
  return m ? parseInt(m[0], 10) : null;
}

function extractYearFromSpecs(specifications) {
  if (!specifications || typeof specifications !== 'object') return null;
  let specs = specifications;
  if (typeof specifications === 'string') {
    try {
      specs = JSON.parse(specifications);
    } catch {
      return null;
    }
  }
  for (const key of SPEC_KEYS_YEAR) {
    const matchedKey = Object.keys(specs || {}).find(k =>
      k.toLowerCase().replace(/[\s_-]/g, '').includes(key.replace(/[\s_-]/g, ''))
    );
    const val = specs[key] ?? (matchedKey ? specs[matchedKey] : undefined);
    if (val != null && val !== '') {
      const year = typeof val === 'number' ? val : extractYearFromText(String(val)) ?? parseInt(String(val).replace(/\D/g, '').slice(0, 4), 10);
      if (year && year >= 1900 && year <= new Date().getFullYear() + 1) return year;
    }
  }
  // Extract from specifications.features - only when feature suggests model/registration year
  const features = specs?.features;
  const yearKeywords = /registrerad|modellår|årgång|först\s*reg|model\s*year|immatricol|annee|année/;
  if (Array.isArray(features)) {
    for (const f of features) {
      const s = String(f || '').toLowerCase();
      if (yearKeywords.test(s)) {
        const m = s.match(/\b(19[89]\d|20[0-2]\d)\b/);
        if (m) {
          const y = parseInt(m[1], 10);
          if (y >= 1990 && y <= new Date().getFullYear() + 1 && !TAX_LIKE_NUMBERS.has(y)) {
            return y;
          }
        }
      }
    }
  }
  return null;
}

function extractYearFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(YEAR_REGEX);
  if (!m) return null;
  const year = parseInt(m[0], 10);
  return (year >= 1900 && year <= new Date().getFullYear() + 1) ? year : null;
}

function extractYearFromExisting(listing) {
  let year = extractYearFromSpecs(listing.specifications);
  if (year) return year;
  year = extractYearFromText(listing.description);
  if (year) return year;
  year = extractYearFromUrl(listing.url);
  if (year) return year;
  return null;
}

async function getMedianYearFromSimilarListings(brand, model) {
  const currentYear = new Date().getFullYear();
  const { data } = await supabase
    .from('listings')
    .select('year')
    .not('year', 'is', null)
    .neq('year', 2000) // Exclude erroneous default
    .ilike('brand', brand)
    .ilike('model', `%${(model || '').replace(/%/g, '')}%`)
    .gte('year', 1990)
    .lte('year', currentYear + 1)
    .limit(500);
  if (!data?.length) return null;
  const years = data.map((r) => r.year).filter(Boolean).sort((a, b) => a - b);
  const mid = Math.floor(years.length / 2);
  return years.length % 2 ? years[mid] : Math.round((years[mid - 1] + years[mid]) / 2);
}

function buildBytbilUrl(sourceListingId) {
  if (!sourceListingId || typeof sourceListingId !== 'string') return null;
  const id = sourceListingId.trim();
  if (!id) return null;
  return `https://www.bytbil.com/bil/${id}`;
}

async function getBytbilUrlFromScraperListings(sourceListingId) {
  try {
    const { data } = await supabase
      .from('scraper_listings')
      .select('link')
      .eq('source', 'bytbil')
      .ilike('link', `%${sourceListingId}%`)
      .limit(1)
      .maybeSingle();
    return data?.link || null;
  } catch {
    return null;
  }
}

async function fetchYearFromUrl(sourcePlatform, url) {
  const platform = String(sourcePlatform || '').toLowerCase();
  if (platform === 'bytbil' && url) {
    const detail = await fetchBytbilDetailViaScraper(url);
    if (!detail?.specifications) return null;
    const yearVal = detail.specifications['år'] ?? detail.specifications['year'];
    if (yearVal != null) {
      const year = typeof yearVal === 'number' ? yearVal : extractYearFromText(String(yearVal)) ?? parseInt(String(yearVal), 10);
      if (year && year >= 1900 && year <= new Date().getFullYear() + 1) return year;
    }
    return extractYearFromText(detail.description);
  }
  return null;
}

async function fixNullYears(options = {}) {
  const doFetch = options.fetch === true;
  const fix2000 = options.fix2000 === true;
  const limit = Math.min(parseInt(options.limit, 10) || 1000, 20000);
  const currentYear = new Date().getFullYear();

  console.log('🔍 Recherche des annonces avec year = NULL' + (fix2000 ? ' ou year = 2000 (erroné)' : '') + '...\n');
  if (doFetch) console.log('   Mode: extraction + re-fetch des pages source\n');

  let query = supabase
    .from('listings')
    .select('id, year, brand, model, url, specifications, description, source_platform, source_listing_id')
    .limit(limit);

  if (fix2000) {
    query = query.or('year.is.null,year.eq.2000');
  } else {
    query = query.is('year', null);
  }

  const { data: listings, error: findError } = await query;

  if (findError) {
    console.error('❌ Erreur:', findError.message);
    process.exit(1);
  }

  if (!listings?.length) {
    console.log('✅ Aucune annonce avec year = NULL.\n');
    return;
  }

  console.log(`📋 ${listings.length} annonce(s) avec year = NULL\n`);

  let fixedFromExisting = 0;
  let fixedFromSimilar = 0;
  let fixedFromFetch = 0;
  let skipped = 0;

  for (const listing of listings) {
    let year = extractYearFromExisting(listing);
    let fromFetch = false;
    let fromSimilar = false;

    if (!year && listing.brand && listing.model) {
      year = await getMedianYearFromSimilarListings(listing.brand, listing.model);
      if (year) fromSimilar = true;
    }

    if (!year && doFetch && listing.source_platform === 'bytbil') {
      let url = listing.url;
      if (!url && listing.source_listing_id) {
        url = await getBytbilUrlFromScraperListings(listing.source_listing_id)
          || buildBytbilUrl(listing.source_listing_id);
      }
      if (url) {
        try {
          year = await fetchYearFromUrl('bytbil', url);
          if (year) fromFetch = true;
        } catch (err) {
          console.log(`   ⚠️  Fetch failed ${listing.brand} ${listing.model}: ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (!year || year < 1900 || year > currentYear + 1) {
      skipped++;
      continue;
    }

    if (fromFetch) fixedFromFetch++;
    else if (fromSimilar) fixedFromSimilar++;
    else fixedFromExisting++;

    const { error: updateError } = await supabase
      .from('listings')
      .update({ year, updated_at: new Date().toISOString() })
      .eq('id', listing.id);

    if (updateError) {
      console.error(`   ❌ Update failed ${listing.id}: ${updateError.message}`);
      skipped++;
    } else {
      console.log(`   ✅ ${listing.brand} ${listing.model}: year = ${year}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Résumé:');
  console.log(`   ✅ Corrigées (données existantes): ${fixedFromExisting}`);
  if (fixedFromSimilar) console.log(`   ✅ Corrigées (médiane similaires): ${fixedFromSimilar}`);
  if (doFetch) console.log(`   ✅ Corrigées (re-fetch): ${fixedFromFetch}`);
  console.log(`   ⚠️  Non corrigées: ${skipped}`);
  console.log('');
}

const args = process.argv.slice(2);
const fetch = args.includes('--fetch');
const fix2000 = args.includes('--fix-2000');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 && args[limitIdx + 1] ? args[limitIdx + 1] : undefined;

fixNullYears({ fetch, fix2000, limit }).catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
