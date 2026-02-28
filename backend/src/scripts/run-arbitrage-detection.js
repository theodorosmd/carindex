/**
 * Run arbitrage auto-detection manually (e.g. npm run arbitrage:detect)
 */

import { runArbitrageDetection } from '../jobs/arbitrageDetectionJob.js';

runArbitrageDetection()
  .then(r => {
    console.log('Done:', r);
    process.exit(0);
  })
  .catch(err => {
    console.error('Arbitrage detection failed:', err.message);
    process.exit(1);
  });
