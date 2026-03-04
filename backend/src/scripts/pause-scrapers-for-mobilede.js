#!/usr/bin/env node
/**
 * Pause Blocket, LeBonCoin, AutoScout24 to free resources for mobile.de.
 * Keeps mobile.de and Bytbil active.
 *
 * Usage: node src/scripts/pause-scrapers-for-mobilede.js
 * To resume: node src/scripts/pause-scrapers-for-mobilede.js --resume
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';

const TO_PAUSE = ['blocket', 'leboncoin', 'autoscout24'];
const LABELS = { blocket: 'Blocket.se', leboncoin: 'LeBonCoin', autoscout24: 'AutoScout24' };

async function main() {
  const resume = process.argv.includes('--resume');

  const { data: scrapers, error } = await supabase
    .from('auto_scrapers')
    .select('id, source, enabled')
    .in('source', TO_PAUSE);

  if (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }

  if (!scrapers?.length) {
    console.log('Aucun scraper trouvé pour', TO_PAUSE.join(', '));
    process.exit(0);
  }

  const targetEnabled = resume;
  for (const s of scrapers) {
    const { error: upErr } = await supabase
      .from('auto_scrapers')
      .update({ enabled: targetEnabled })
      .eq('id', s.id);

    const label = LABELS[s.source] || s.source;
    if (upErr) {
      console.log(`❌ ${label}: ${upErr.message}`);
    } else {
      console.log(`${resume ? '▶️' : '⏸️'} ${label}: ${targetEnabled ? 'Actif' : 'Pausé'}`);
    }
  }

  console.log(resume ? '\n✅ Scrapers réactivés.' : '\n✅ Scrapers pausés. mobile.de et Bytbil restent actifs.');
}

main();
