#!/usr/bin/env node
/**
 * Affiche les derniers scraper runs en échec avec leur message d'erreur
 * Usage: node check-failed-runs.js [--since 6h|24h|7d]
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';

function parseSince(val) {
  if (!val || typeof val !== 'string') return null;
  const m = val.match(/^(\d+)(h|d)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const cutoff = new Date();
  if (m[2] === 'h') cutoff.setHours(cutoff.getHours() - n);
  else cutoff.setDate(cutoff.getDate() - n);
  return cutoff;
}

async function main() {
  const idx = process.argv.indexOf('--since');
  const sinceVal = idx >= 0 ? process.argv[idx + 1] : null;
  const sinceCutoff = parseSince(sinceVal);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = sinceCutoff || thirtyDaysAgo;
  const cutoffLabel = sinceCutoff ? `depuis ${sinceVal}` : '30 derniers jours';

  const { data: scraperRuns, error } = await supabase
    .from('scraper_runs')
    .select('id, source_platform, status, error_message, started_at, finished_at')
    .eq('status', 'failed')
    .gte('started_at', cutoff.toISOString())
    .order('started_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`\n=== Échecs scraper_runs (${cutoffLabel}) ===\n`);
  for (const run of scraperRuns || []) {
    console.log(`${run.source_platform} | ${run.started_at}`);
    console.log(`  → ${run.error_message || '(pas de message)'}\n`);
  }

  // scraper_run (bytbil Python) - échecs via error_count > 0
  const { data: scraperRunLegacy } = await supabase
    .from('scraper_run')
    .select('id, source, start_time, end_time, error_count')
    .gte('start_time', cutoff.toISOString())
    .gt('error_count', 0)
    .order('start_time', { ascending: false })
    .limit(10);

  if (scraperRunLegacy?.length) {
    console.log(`=== Échecs scraper_run (legacy, ${cutoffLabel}) ===\n`);
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

  const cutoffTs = cutoff.getTime();
  const autoScrapersFiltered = (autoScrapers || []).filter((s) => s.last_run_at && new Date(s.last_run_at).getTime() >= cutoffTs);
  if (autoScrapersFiltered.length) {
    console.log(`=== Auto-scrapers en erreur (${cutoffLabel}) ===\n`);
    for (const s of autoScrapersFiltered) {
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
