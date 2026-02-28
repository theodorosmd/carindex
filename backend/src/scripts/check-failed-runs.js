#!/usr/bin/env node
/**
 * Affiche les derniers scraper runs en échec avec leur message d'erreur
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';

async function main() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: scraperRuns, error } = await supabase
    .from('scraper_runs')
    .select('id, source_platform, status, error_message, started_at, finished_at')
    .eq('status', 'failed')
    .gte('started_at', thirtyDaysAgo.toISOString())
    .order('started_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('\n=== Échecs scraper_runs (30 derniers jours) ===\n');
  for (const run of scraperRuns || []) {
    console.log(`${run.source_platform} | ${run.started_at}`);
    console.log(`  → ${run.error_message || '(pas de message)'}\n`);
  }

  // scraper_run (bytbil Python) - échecs via error_count > 0
  const { data: scraperRunLegacy } = await supabase
    .from('scraper_run')
    .select('id, source, start_time, end_time, error_count')
    .gte('start_time', thirtyDaysAgo.toISOString())
    .gt('error_count', 0)
    .order('start_time', { ascending: false })
    .limit(10);

  if (scraperRunLegacy?.length) {
    console.log('=== Échecs scraper_run (legacy, error_count > 0) ===\n');
    for (const r of scraperRunLegacy) {
      console.log(`${r.source} | ${r.start_time} | errors: ${r.error_count}\n`);
    }
  }

  // auto_scrapers avec last_run_status = error
  const { data: autoScrapers } = await supabase
    .from('auto_scrapers')
    .select('source, name, last_run_at, last_run_status, last_run_result')
    .eq('last_run_status', 'error')
    .not('last_run_result', 'is', null);

  if (autoScrapers?.length) {
    console.log('=== Auto-scrapers en erreur ===\n');
    for (const s of autoScrapers) {
      const err = s.last_run_result?.error || '(détails indisponibles)';
      console.log(`${s.source} | ${s.name} | ${s.last_run_at}`);
      console.log(`  → ${err}\n`);
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
