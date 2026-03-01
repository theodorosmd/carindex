/**
 * PM2 ecosystem config pour le worker de scraping sur VPS.
 * Usage: cd backend && pm2 start ecosystem.config.cjs
 *
 * Toujours actif : max_restarts élevé + restart_delay.
 * Après git pull : pm2 restart carindex-scraper
 */
module.exports = {
  apps: [
    {
      name: 'carindex-scraper',
      script: 'src/start.js',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '2G',
      restart_delay: 5000,
      max_restarts: 9999, // Keep trying on crash
      min_uptime: '10s',  // Consider crash if dies before 10s
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
