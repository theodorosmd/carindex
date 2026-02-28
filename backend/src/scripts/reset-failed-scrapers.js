#!/usr/bin/env node
/**
 * Reset scrapers en erreur ou bloqués en "running" pour permettre un nouveau run.
 * Met à jour auto_scrapers.last_run_status = null.
 *
 * Usage: node src/scripts/reset-failed-scrapers.js
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';

async function resetFailedScrapers() {
  console.log('🔄 Reset scrapers en erreur ou bloqués...\n');

  const { data: scrapers, error } = await supabase
    .from('auto_scrapers')
    .select('id, name, source, last_run_status')
    .in('last_run_status', ['error', 'running']);

  if (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }

  if (!scrapers?.length) {
    console.log('   Aucun scraper à réinitialiser.');
    return;
  }

  for (const s of scrapers) {
    const { error: upErr } = await supabase
      .from('auto_scrapers')
      .update({
        last_run_status: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', s.id);

    if (upErr) {
      console.error(`   ❌ ${s.name}: ${upErr.message}`);
    } else {
      console.log(`   ✅ ${s.name} (${s.source}): status réinitialisé`);
    }
  }

  console.log(`\n📊 ${scrapers.length} scraper(s) réinitialisé(s).`);
}

resetFailedScrapers().catch((e) => {
  console.error('Erreur:', e);
  process.exit(1);
});
