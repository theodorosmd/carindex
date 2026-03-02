#!/usr/bin/env node
/**
 * Vérifie la config Puppeteer sur le VPS.
 * Usage: node src/scripts/check-puppeteer-env.js
 */
import 'dotenv/config';
import { existsSync } from 'node:fs';

console.log('=== Puppeteer env check ===\n');
console.log('Platform:', process.platform);
console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH || '(non défini)');
console.log('CWD:', process.cwd());

const paths = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable'];
console.log('\nChemins Chromium:');
for (const p of paths) {
  console.log(`  ${p}: ${existsSync(p) ? '✓ existe' : '✗ absent'}`);
}

// Simulate getExecutablePath
let resolved = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!resolved && process.platform === 'linux') {
  for (const p of paths) {
    if (existsSync(p)) {
      resolved = p;
      break;
    }
  }
}
console.log('\nRésultat getExecutablePath:', resolved || '(null - utilisera Chrome embarqué)');
if (!resolved && process.platform === 'linux') {
  console.log('\n⚠️  ATTENTION: Chromium système non détecté. Les scrapers échoueront avec libglib.');
  console.log('   Fix: sudo apt install chromium-browser libglib2.0-0');
  console.log('   Puis: echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> backend/.env');
  console.log('   Puis: pm2 restart carindex-scraper --update-env');
}
