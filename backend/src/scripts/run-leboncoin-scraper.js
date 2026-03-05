#!/usr/bin/env node
/**
 * Lance le scraper Leboncoin pour alimenter la queue.
 * Les workers (run-leboncoin-queue-worker) traitent ensuite les URLs.
 *
 * Usage: node -r dotenv/config src/scripts/run-leboncoin-scraper.js
 *   LEBONCOIN_MAX_PAGES=50 node -r dotenv/config src/scripts/run-leboncoin-scraper.js
 *   LEBONCOIN_CONCURRENT_PAGES=1 LEBONCOIN_DELAY_PAGES_MS=2000  # plus lent, plus fiable
 */
import 'dotenv/config';
import { runLeBonCoinScraper } from '../services/leboncoinService.js';
import { DEFAULT_SCRAPER_URLS } from '../config/defaultScraperUrls.js';
import { fetchViaScrapeDo } from '../utils/scrapeDo.js';

const maxPages = parseInt(process.env.LEBONCOIN_MAX_PAGES || '30', 10);
const urls = DEFAULT_SCRAPER_URLS.leboncoin || ['https://www.leboncoin.fr/recherche?category=2&sort=time&order=desc'];

async function checkScrapeDo() {
  if (!process.env.SCRAPE_DO_TOKEN) {
    console.error('❌ SCRAPE_DO_TOKEN manquant dans .env. Inscrivez-vous sur https://scrape.do');
    process.exit(1);
  }
  try {
    await fetchViaScrapeDo(urls[0], { render: false, geoCode: 'fr' });
    return true;
  } catch (err) {
    console.error('❌ scrape.do inaccessible:', err.message);
    console.error('   Vérifiez: token valide, connexion internet, pas de VPN/firewall bloquant.');
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Lancement scraper Leboncoin (alimentation queue)...');
  console.log('   Vérification scrape.do...');
  await checkScrapeDo();
  console.log('   OK\n');
  console.log(`   URLs: ${urls.length}`);
  console.log(`   Max pages: ${maxPages}`);
  console.log(`   Concurrence: ${process.env.LEBONCOIN_CONCURRENT_PAGES || '1'} page(s)\n`);

  const result = await runLeBonCoinScraper(urls, { maxPages }, (progress) => {
    process.stdout.write(`\r   Ajoutés à la queue: ${progress.totalScraped} (nouveaux: ${progress.totalSaved})`);
  });

  console.log('\n\n✅ Terminé');
  console.log(`   Total scrapé: ${result.totalScraped}`);
  console.log(`   Ajoutés à la queue: ${result.saved}`);
  console.log(`   URLs traitées: ${result.processedUrls?.length || 0}`);
  console.log('\n   Les workers vont traiter la queue. Vérifier avec: node -r dotenv/config src/scripts/check-leboncoin-queue.js');
}

main().catch((e) => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
