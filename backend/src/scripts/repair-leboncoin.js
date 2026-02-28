#!/usr/bin/env node

/**
 * Repair script for LeBonCoin listings.
 *
 * 1. Fetches all LeBonCoin raw_listings from DB
 * 2. For items missing detail data (fuel_type, description, images, etc.):
 *    re-scrapes the detail page and merges into raw_payload
 * 3. Resets processed_at to null so processRawListings re-maps everything
 *    with the fixed mapper (clean prefixes, location, etc.)
 *
 * Usage: node backend/src/scripts/repair-leboncoin.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../config/supabase.js';
import { fetchViaScrapeDo } from '../utils/scrapeDo.js';
import { processRawListings } from '../services/rawListingsProcessorService.js';
import * as cheerio from 'cheerio';

const DELAY_MS = 1500;

function needsRescrape(payload) {
  if (!payload) return true;
  const hasFuel = payload.jsonFuelType || payload.specifications?.carburant || payload.specifications?.fuel;
  const hasDesc = payload.description;
  const hasImages = Array.isArray(payload.images) && payload.images.length > 0;
  const hasLocation = payload.locationCity;
  return !hasFuel || !hasDesc || !hasImages || !hasLocation;
}

async function fetchListingDetailsForRepair(listingUrl) {
  const html = await fetchViaScrapeDo(listingUrl, { geoCode: 'fr' });
  const $ = cheerio.load(html);
  const data = {};

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (json['@type'] === 'Vehicle' || json['@type'] === 'Car' || json['@type'] === 'Product') {
        if (Array.isArray(json.image)) {
          data.images = json.image.map(img => typeof img === 'string' ? img : img.contentUrl || img.url || '').filter(Boolean);
        } else if (typeof json.image === 'string') {
          data.images = [json.image];
        }
        if (json.offers?.seller?.['@type'] === 'Organization') data.sellerType = 'professional';
        if (json.name) data.fullTitle = json.name;
        if (json.description) data.description = json.description;
        if (json.brand) data.jsonBrand = typeof json.brand === 'object' ? json.brand.name : json.brand;
        if (json.model) data.jsonModel = json.model;
        if (json.vehicleModelDate) data.jsonYear = parseInt(json.vehicleModelDate, 10) || null;
        if (json.mileageFromOdometer) {
          const mVal = typeof json.mileageFromOdometer === 'object' ? json.mileageFromOdometer.value : json.mileageFromOdometer;
          data.jsonMileage = parseInt(String(mVal).replace(/\D/g, ''), 10) || null;
        }
        if (json.color) data.jsonColor = json.color;
        if (json.bodyType) data.jsonBodyType = json.bodyType;
        if (json.numberOfDoors) data.jsonDoors = parseInt(json.numberOfDoors, 10) || null;
        if (json.vehicleTransmission) data.jsonTransmission = json.vehicleTransmission;
        if (json.vehicleEngine) {
          const eng = json.vehicleEngine;
          if (eng.fuelType) data.jsonFuelType = eng.fuelType;
          if (eng.engineDisplacement) {
            const d = typeof eng.engineDisplacement === 'object' ? eng.engineDisplacement.value : eng.engineDisplacement;
            data.jsonDisplacement = parseFloat(String(d).replace(',', '.')) || null;
          }
          if (eng.enginePower) {
            const p = typeof eng.enginePower === 'object' ? eng.enginePower.value : eng.enginePower;
            data.jsonPowerHp = parseInt(String(p).replace(/\D/g, ''), 10) || null;
          }
        }
      }
    } catch { /* ignore */ }
  });

  if (!data.images || data.images.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) data.images = [ogImg];
  }

  const h1 = $('[data-qa-id="adview_title"]').text().trim() || $('h1').first().text().trim();
  if (h1) data.fullTitle = data.fullTitle || h1;

  const priceEl = $('[data-qa-id="adview_price"]').first().text().trim();
  if (priceEl) {
    const m = priceEl.match(/(\d[\d\s.]*)\s*€/);
    if (m) data.price = parseInt(m[1].replace(/[\s.]/g, ''), 10);
  }

  // Criteria items
  const specs = {};
  const criteriaMap = {
    criteria_item_u_car_brand: 'marque',
    criteria_item_u_car_model: 'modèle',
    criteria_item_mileage: 'kilométrage',
    criteria_item_fuel: 'carburant',
    criteria_item_gearbox: 'boîte de vitesse',
    criteria_item_issuance_date: 'mise en circulation',
    criteria_item_regdate: 'année-modèle',
    criteria_item_doors: 'portes',
    criteria_item_seats: 'places',
    criteria_item_horsepower: 'chevaux fiscaux',
    criteria_item_horse_power_din: 'puissance din',
    criteria_item_vehicule_color: 'couleur',
    criteria_item_vehicle_type: 'type de véhicule',
    criteria_item_vehicle_damage: 'état véhicule',
    criteria_item_critair: 'crit\'air',
    criteria_item_vehicle_euro_emissions_standard: 'norme euro',
    criteria_item_vehicle_specifications: 'finition',
    criteria_item_vehicle_upholstery: 'sellerie',
    criteria_item_vehicle_vsp: 'permis',
    criteria_item_vehicle_battery_state_of_health: 'état batterie',
  };

  for (const [qaId, label] of Object.entries(criteriaMap)) {
    const el = $(`[data-qa-id="${qaId}"]`);
    if (el.length) {
      const children = $(el).children();
      if (children.length >= 2) {
        const value = $(children[children.length - 1]).text().trim();
        if (value) specs[label] = value;
      }
    }
  }

  $('[data-qa-id^="criteria_item_"]').each((_, el) => {
    const qaId = $(el).attr('data-qa-id');
    if (criteriaMap[qaId]) return;
    const children = $(el).children();
    if (children.length >= 2) {
      const label = $(children[0]).text().trim().toLowerCase();
      const value = $(children[children.length - 1]).text().trim();
      if (label && value) specs[label] = value;
    }
  });

  data.specifications = specs;

  const descEl = $('[data-qa-id="adview_description_container"]').text().trim();
  if (descEl && descEl.length > 5) data.description = data.description || descEl;

  // __NEXT_DATA__
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript);
      const ad = nextData?.props?.pageProps?.ad;
      if (ad) {
        const loc = ad.location || {};
        data.locationCity = loc.city || null;
        data.locationZipcode = loc.zipcode || null;
        data.locationRegion = loc.region_name || null;
        data.locationDepartment = loc.department_name || null;
        data.locationDepartmentId = loc.department_id || null;
        data.locationLat = loc.lat || null;
        data.locationLng = loc.lng || null;

        const owner = ad.owner || {};
        if (owner.type === 'pro' || owner.type === 'professional') data.sellerType = 'professional';
        else if (owner.type === 'private') data.sellerType = 'private';
        if (owner.name) data.sellerName = owner.name;

        if (ad.attributes) {
          for (const attr of ad.attributes) {
            const key = attr.key || attr.key_label || '';
            const val = attr.value_label || attr.value || '';
            if (key && val && !specs[key.toLowerCase()]) {
              specs[key.toLowerCase()] = val;
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  if (!data.locationCity) {
    $('span').each((_, el) => {
      const text = $(el).text().trim();
      const m = text.match(/^([A-ZÀ-Üa-zà-ü-]+(?:\s+[A-ZÀ-Üa-zà-ü-]+)*)\s+(\d{5})$/);
      if (m && !data.locationCity) {
        data.locationCity = m[1];
        data.locationZipcode = m[2];
      }
    });
  }

  return data;
}

async function main() {
  console.log('=== LeBonCoin Repair Script ===\n');

  // Step 1: Fetch all leboncoin raw_listings
  console.log('Step 1: Fetching LeBonCoin raw_listings...');
  const { data: rawRows, error } = await supabase
    .from('raw_listings')
    .select('id, source_listing_id, raw_payload')
    .eq('source_platform', 'leboncoin')
    .order('scraped_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch raw_listings:', error.message);
    process.exit(1);
  }

  console.log(`Found ${rawRows.length} raw_listings\n`);

  // Step 2: Identify items needing re-scrape
  const toRescrape = rawRows.filter(r => needsRescrape(r.raw_payload));
  const okItems = rawRows.length - toRescrape.length;
  console.log(`Step 2: ${toRescrape.length} need detail re-scrape, ${okItems} already have full data\n`);

  // Step 3: Re-scrape detail pages for incomplete items
  let rescrapeSuccess = 0;
  let rescrapeFail = 0;

  for (let i = 0; i < toRescrape.length; i++) {
    const row = toRescrape[i];
    const url = row.raw_payload?.url;
    if (!url) {
      console.log(`  [${i + 1}/${toRescrape.length}] No URL for ${row.source_listing_id}, skipping`);
      rescrapeFail++;
      continue;
    }

    console.log(`  [${i + 1}/${toRescrape.length}] Re-scraping ${url}...`);
    try {
      const details = await fetchListingDetailsForRepair(url);
      const merged = { ...row.raw_payload, ...details };

      if (details.specifications) {
        merged.specifications = { ...(row.raw_payload.specifications || {}), ...details.specifications };
      }

      const { error: updErr } = await supabase
        .from('raw_listings')
        .update({
          raw_payload: merged,
          processed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updErr) throw updErr;

      const fields = [
        details.locationCity ? 'city' : null,
        details.jsonFuelType ? 'fuel' : null,
        details.description ? 'desc' : null,
        details.images?.length ? `${details.images.length}imgs` : null,
        details.jsonColor ? 'color' : null,
        details.jsonDoors ? 'doors' : null,
        details.jsonPowerHp ? 'power' : null,
      ].filter(Boolean);
      console.log(`    OK: got [${fields.join(', ')}]`);
      rescrapeSuccess++;
    } catch (err) {
      console.log(`    FAIL: ${err.message.substring(0, 100)}`);
      rescrapeFail++;
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nRe-scrape results: ${rescrapeSuccess} success, ${rescrapeFail} failed\n`);

  // Step 4: Reset processed_at for ALL leboncoin raw_listings to trigger re-processing
  console.log('Step 4: Resetting processed_at for all LeBonCoin raw_listings...');
  const { error: resetErr } = await supabase
    .from('raw_listings')
    .update({ processed_at: null })
    .eq('source_platform', 'leboncoin');

  if (resetErr) {
    console.error('Failed to reset processed_at:', resetErr.message);
    process.exit(1);
  }
  console.log(`Reset ${rawRows.length} raw_listings\n`);

  // Step 5: Re-process through the fixed mapper
  console.log('Step 5: Re-processing with fixed mapper...');
  const result = await processRawListings({ sourcePlatform: 'leboncoin', limit: 5000 });
  console.log('Processing result:', JSON.stringify(result, null, 2));

  console.log('\n=== Repair complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
