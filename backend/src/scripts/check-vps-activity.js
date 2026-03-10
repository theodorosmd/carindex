#!/usr/bin/env node
/**
 * Check VPS scraping activity by querying Supabase.
 * Run from project root: cd backend && node src/scripts/check-vps-activity.js
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';

const HOURS_AGO = 24;

async function main() {
  const since = new Date();
  since.setHours(since.getHours() - HOURS_AGO);

  console.log(`\n=== VPS Activity Check (last ${HOURS_AGO}h) ===\n`);

  // Recent scraper_runs
  const { data: runs, error: runsErr } = await supabase
    .from('scraper_runs')
    .select('source_platform, status, started_at, finished_at, total_scraped, total_saved, total_failed')
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: false })
    .limit(50);

  if (runsErr) {
    console.error('Error fetching scraper_runs:', runsErr.message);
    process.exit(1);
  }

  const byStatus = { success: 0, failed: 0, running: 0 };
  const bySource = {};
  const byHour = {}; // runs per hour (UTC) — detect gaps at night
  for (const r of runs || []) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    bySource[r.source_platform] = (bySource[r.source_platform] || 0) + 1;
    const h = new Date(r.started_at).getUTCHours();
    byHour[h] = (byHour[h] || 0) + 1;
  }

  console.log('Scraper runs:');
  console.log(`  Total: ${runs?.length || 0} runs`);
  console.log(`  Success: ${byStatus.success || 0} | Failed: ${byStatus.failed || 0} | Running: ${byStatus.running || 0}`);
  if (runs?.length > 0) {
    const last = runs[0];
    console.log(`  Last run: ${last.source_platform} @ ${last.started_at} (${last.status})`);
    if (last.total_scraped != null) console.log(`    → scraped: ${last.total_scraped}, saved: ${last.total_saved}`);
  }
  console.log('');
  if (Object.keys(byHour).length > 0) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const bars = hours.map((h) => (byHour[h] ? ` ${byHour[h]} ` : '  · '));
    console.log('Runs by hour (UTC):');
    console.log('  ' + hours.map((h) => String(h).padStart(2)).join(' '));
    console.log('  ' + bars.join(''));
    const emptyHours = hours.filter((h) => !byHour[h]).length;
    if (emptyHours > 12) console.log('  ⚠️  Many hours with no runs — scrapers may be sleeping (Railway?) or VPS down');
  }
  console.log('');

  // Recent raw_listings count
  const { count: rawCount, error: rawErr } = await supabase
    .from('raw_listings')
    .select('*', { count: 'exact', head: true })
    .gte('scraped_at', since.toISOString());

  if (rawErr) {
    console.warn('Could not count raw_listings:', rawErr.message);
  } else {
    console.log(`Raw listings (last ${HOURS_AGO}h): ${rawCount ?? 0}`);
  }

  // auto_scrapers last runs
  const { data: autoScrapers, error: asErr } = await supabase
    .from('auto_scrapers')
    .select('source, name, last_run_at, last_run_status')
    .gte('last_run_at', since.toISOString())
    .order('last_run_at', { ascending: false })
    .limit(10);

  if (!asErr && autoScrapers?.length > 0) {
    console.log('\nAuto-scrapers (recent):');
    for (const s of autoScrapers) {
      const status = s.last_run_status === 'success' ? '✓' : s.last_run_status === 'error' ? '✗' : '?';
      console.log(`  ${status} ${s.source} | ${s.name} @ ${s.last_run_at}`);
    }
  }

  console.log('\nVerdict: ', runs?.length > 0 ? 'VPS appears active ✓' : 'No recent runs - VPS may be down or idle');
  console.log('');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
