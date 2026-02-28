/**
 * PM2 ecosystem config pour le worker de scraping sur VPS.
 * Usage: cd backend && pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'carindex-scraper',
      script: 'src/start.js',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '2G',
      restart_delay: 5000,
    },
  ],
};
