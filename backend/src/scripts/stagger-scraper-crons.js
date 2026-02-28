#!/usr/bin/env node
/**
 * Update auto_scrapers to use staggered cron minutes so they don't all run at once.
 * Prevents memory overload and rate limiting when 14 scrapers fire simultaneously.
 *
 * Usage: node src/scripts/stagger-scraper-crons.js
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';

// Minute offset per source (0-55, every 4 min) - spreads over the hour
const MINUTE_OFFSETS = {
  autoscout24: 0,
  'mobile.de': 4,
  leboncoin: 8,
  largus: 12,
  lacentrale: 16,
  gaspedaal: 20,
  marktplaats: 24,
  subito: 28,
  'coches.net': 32,
  cochesnet: 32,
  blocket: 36,
  bilweb: 40,
  bytbil: 44,
  finn: 48,
  otomoto: 52,
  '2ememain': 56,
  deuxememain: 56
};

async function staggerCrons() {
  console.log('⏱️  Staggering auto_scraper cron schedules...\n');

  const { data: scrapers, error } = await supabase
    .from('auto_scrapers')
    .select('id, source, name, schedule_cron');

  if (error) {
    console.error('Failed to fetch scrapers:', error.message);
    process.exit(1);
  }

  for (const scraper of scrapers || []) {
    const minute = MINUTE_OFFSETS[scraper.source] ?? 0;
    // Keep "every 6 hours" but stagger the minute: 0,6,12,18 at :minute
    const newCron = `${minute} */6 * * *`;

    if (scraper.schedule_cron === newCron) {
      console.log(`   ⏭️  ${scraper.name}: already staggered (${newCron})`);
      continue;
    }

    const { error: updErr } = await supabase
      .from('auto_scrapers')
      .update({ schedule_cron: newCron })
      .eq('id', scraper.id);

    if (updErr) {
      console.error(`   ❌ ${scraper.name}: ${updErr.message}`);
    } else {
      console.log(`   ✅ ${scraper.name}: ${scraper.schedule_cron} → ${newCron}`);
    }
  }

  console.log('\n📊 Done. Restart the backend to apply new schedules.');
}

staggerCrons().catch((e) => {
  console.error('Erreur:', e);
  process.exit(1);
});
