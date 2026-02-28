#!/usr/bin/env node
/**
 * Seed auto_scrapers table with one scraper per source.
 * Uses DEFAULT_SCRAPER_URLS - creates scraper only if none enabled for that source.
 *
 * Usage: node src/scripts/seed-auto-scrapers.js
 * Prérequis: .env avec SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import { DEFAULT_SCRAPER_URLS } from '../config/defaultScraperUrls.js';

const SOURCE_LABELS = {
  autoscout24: 'AutoScout24',
  'mobile.de': 'mobile.de',
  leboncoin: 'LeBonCoin',
  largus: "L'Argus",
  lacentrale: 'La Centrale',
  gaspedaal: 'Gaspedaal.nl',
  marktplaats: 'Marktplaats.nl',
  subito: 'Subito.it',
  'coches.net': 'coches.net',
  blocket: 'Blocket.se',
  bilweb: 'Bilweb.se',
  bytbil: 'Bytbil.com',
  finn: 'FINN.no',
  otomoto: 'OtoMoto.pl',
  '2ememain': '2ememain.be'
};

// Toutes les 6 heures, avec minutes décalées pour éviter le lancement simultané
const CRON_BY_SOURCE = {
  autoscout24: '0 */6 * * *',
  'mobile.de': '4 */6 * * *',
  leboncoin: '8 */6 * * *',
  largus: '12 */6 * * *',
  lacentrale: '16 */6 * * *',
  gaspedaal: '20 */6 * * *',
  marktplaats: '24 */6 * * *',
  subito: '28 */6 * * *',
  'coches.net': '32 */6 * * *',
  blocket: '36 */6 * * *',
  bilweb: '40 */6 * * *',
  bytbil: '44 */6 * * *',
  finn: '48 */6 * * *',
  otomoto: '52 */6 * * *',
  '2ememain': '56 */6 * * *'
};

async function seedAutoScrapers() {
  console.log('🌱 Seed auto_scrapers...\n');

  const { data: existing } = await supabase
    .from('auto_scrapers')
    .select('id, source, enabled');

  const existingBySource = new Set(
    (existing || []).filter((s) => s.enabled).map((s) => s.source)
  );

  let created = 0;
  for (const [source, searchUrls] of Object.entries(DEFAULT_SCRAPER_URLS)) {
    if (existingBySource.has(source)) {
      console.log(`   ⏭️  ${SOURCE_LABELS[source] || source}: déjà un scraper actif`);
      continue;
    }

    const name = `${SOURCE_LABELS[source] || source} - principal`;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    const scheduleCron = CRON_BY_SOURCE[source] || '0 */6 * * *';
    const { data: inserted, error } = await supabase
      .from('auto_scrapers')
      .insert({
        source,
        name,
        search_urls: urls,
        schedule_cron: scheduleCron,
        max_results: 999999,
        result_limit_per_thread: 10000,
        enabled: true
      })
      .select('id')
      .single();

    if (error) {
      console.error(`   ❌ ${name}: ${error.message}`);
      continue;
    }

    console.log(`   ✅ ${name}: créé (${inserted.id})`);
    created++;
    existingBySource.add(source);
  }

  console.log(`\n📊 ${created} scrapers créés. Redémarrez le backend pour charger les crons.`);
}

seedAutoScrapers().catch((e) => {
  console.error('Erreur:', e);
  process.exit(1);
});
