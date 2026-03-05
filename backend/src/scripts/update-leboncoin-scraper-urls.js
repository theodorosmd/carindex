#!/usr/bin/env node
/**
 * Met à jour les URLs du scraper Leboncoin dans auto_scrapers.
 * Utilise les URLs optimisées (recherche?category=2&sort=time&order=desc pour les plus récentes).
 *
 * Usage: node -r dotenv/config src/scripts/update-leboncoin-scraper-urls.js
 */
import 'dotenv/config';
import { supabase } from '../config/supabase.js';

const LEBONCOIN_URLS = [
  'https://www.leboncoin.fr/recherche?category=2&sort=time&order=desc',
  'https://www.leboncoin.fr/c/voitures'
];

async function main() {
  const { data: scrapers, error: fetchErr } = await supabase
    .from('auto_scrapers')
    .select('id, source, name, search_urls')
    .eq('source', 'leboncoin');

  if (fetchErr) {
    console.error('Erreur:', fetchErr.message);
    process.exit(1);
  }

  if (!scrapers?.length) {
    console.log('Aucun scraper Leboncoin trouvé. Lancez: npm run seed:scrapers');
    return;
  }

  for (const s of scrapers) {
    const { error: updateErr } = await supabase
      .from('auto_scrapers')
      .update({ search_urls: LEBONCOIN_URLS })
      .eq('id', s.id);

    if (updateErr) {
      console.error(`Erreur mise à jour ${s.name}:`, updateErr.message);
    } else {
      console.log(`✅ ${s.name}: URLs mises à jour`);
    }
  }
  console.log('\nRedémarrez le backend pour recharger les crons.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
