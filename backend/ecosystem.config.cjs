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
      env: {
        NODE_ENV: 'production',
        // PUPPETEER_EXECUTABLE_PATH doit venir de .env (ex: /snap/bin/chromium sur Ubuntu 24.04)
        // Ne pas le définir ici : sinon ça écrase le .env et /usr/bin/chromium-browser n'existe pas sur Ubuntu 24
      },
      max_memory_restart: '6G', // SCRAPE_CONCURRENCY=8 → ~8 Chromium, prévoir 4–6 Go
      restart_delay: 8000,  // Attendre que l'ancien processus libère le port 3001
      max_restarts: 9999, // Keep trying on crash
      min_uptime: '10s',  // Consider crash if dies before 10s
      listen_timeout: 15000,
      kill_timeout: 10000,  // Plus de temps pour libérer le port avant SIGKILL
    },
    {
      name: 'carindex-mobilede-worker',
      script: 'src/scripts/run-mobilede-queue-worker.js',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      instances: 5,  // 5 workers en parallèle (remplace Oleg)
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 9999,
    },
    {
      name: 'carindex-leboncoin-worker',
      script: 'src/scripts/run-leboncoin-queue-worker.js',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      instances: 20,  // 20 workers pour ~300k/jour (Oleg: 300k en qq jours)
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 9999,
    },
  ],
};
