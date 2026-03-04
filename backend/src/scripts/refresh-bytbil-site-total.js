#!/usr/bin/env node
/**
 * Refresh site totals for all marketplaces (for % scrapé in admin dashboard).
 * Run after applying migration 20260302100000_add_source_site_totals.sql
 *
 * Usage:
 *   node src/scripts/refresh-bytbil-site-total.js              # fetch all via scrape.do
 *   node src/scripts/refresh-bytbil-site-total.js bytbil       # fetch one source
 *   node src/scripts/refresh-bytbil-site-total.js --seed       # insert known values (bypass fetch)
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';
import { fetchAndPersistSiteTotal, refreshAllSiteTotals } from '../services/sourceSiteTotalsService.js';

const arg = process.argv[2];

if (arg === '--seed') {
  // Valeurs connues (à ajuster si besoin) — permet d'afficher le % même si scrape.do échoue
  const KNOWN_TOTALS = {
    autoscout24: 3_318_614,  // Europe: DE 2.07M + ES 282k + NL 253k + IT 392k + AT 115k + BE 109k + FR 92k + LU 7k
    bytbil: 82_011,
    leboncoin: 733_444,
    blocket: 134_998,
    'mobile.de': 1_418_365,
    gaspedaal: 65_000,
    marktplaats: 15_000,
    largus: 469_001,     // L'Argus: annonces occasion & neufs
    lacentrale: 385_551, // La Centrale: bouton Rechercher
    bilweb: 63_730,      // Bilweb: "Sökresultat - 63 730 fordon"
  };
  console.log('Seeding source_site_totals with known values...');
  for (const [source, total] of Object.entries(KNOWN_TOTALS)) {
    const { error } = await supabase
      .from('source_site_totals')
      .upsert({ source_platform: source, total_available: total, last_updated: new Date().toISOString() }, { onConflict: 'source_platform' });
    console.log(error ? `  ❌ ${source}: ${error.message}` : `  ✅ ${source}: ${total.toLocaleString('fr-FR')}`);
  }
  console.log('Done. Refresh the admin dashboard.');
  process.exit(0);
}

if (arg && arg !== '--seed') {
  const total = await fetchAndPersistSiteTotal(arg);
  console.log(total != null ? `✅ ${arg}: ${total.toLocaleString('fr-FR')} véhicules` : `❌ ${arg}: could not fetch (check SCRAPE_DO_TOKEN, patterns)`);
} else {
  if (!process.env.SCRAPE_DO_TOKEN) {
    console.warn('⚠️  SCRAPE_DO_TOKEN not set. Run with --seed to insert known values.');
  }
  console.log('Refreshing all site totals (2s delay between each)...');
  const results = await refreshAllSiteTotals();
  const ok = Object.values(results).filter(Boolean).length;
  for (const [s, t] of Object.entries(results)) {
    console.log(t != null ? `  ✅ ${s}: ${t.toLocaleString('fr-FR')}` : `  ❌ ${s}: failed`);
  }
  console.log(`\n${ok}/${Object.keys(results).length} succeeded. Run with --seed if all failed.`);
}
