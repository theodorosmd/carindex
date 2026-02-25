/**
 * Run Largus scraper - fetches new listings and saves to DB
 * Run: node src/scripts/run-largus-scrape.js
 * Env: MAX_LISTINGS=5 (default 5) to limit how many to scrape
 */
import 'dotenv/config';
import { runLargusScraper } from '../services/largusService.js';

const searchUrl = 'https://occasion.largus.fr/auto/?npp=15';
const maxListings = parseInt(process.env.MAX_LISTINGS || '5', 10);

runLargusScraper([searchUrl], { maxPages: 1, maxListings })
  .then((result) => {
    console.log('\n✅ Scrape Largus terminé:', result);
  })
  .catch((err) => {
    console.error('Erreur:', err);
    process.exit(1);
  });
