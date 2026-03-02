#!/usr/bin/env node
/**
 * Refresh site totals for all marketplaces (for % scrapé in admin dashboard).
 * Run after applying migration 20260302100000_add_source_site_totals.sql
 * Usage: node src/scripts/refresh-bytbil-site-total.js
 *        node src/scripts/refresh-bytbil-site-total.js autoscout24  (single source)
 */
import { fetchAndPersistSiteTotal, refreshAllSiteTotals } from '../services/sourceSiteTotalsService.js';

const source = process.argv[2];
if (source) {
  const total = await fetchAndPersistSiteTotal(source);
  console.log(total != null ? `✅ ${source}: ${total.toLocaleString('fr-FR')} véhicules` : `❌ ${source}: could not fetch`);
} else {
  console.log('Refreshing all site totals (2s delay between each)...');
  const results = await refreshAllSiteTotals();
  for (const [s, t] of Object.entries(results)) {
    console.log(t != null ? `  ✅ ${s}: ${t.toLocaleString('fr-FR')}` : `  ❌ ${s}: failed`);
  }
}
