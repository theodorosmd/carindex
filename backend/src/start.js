import http from 'node:http';

const PORT = process.env.PORT || 3000;

// Éviter les crashs silencieux : promesses rejetées non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('[start] unhandledRejection — le processus continue', { reason, promise });
});

process.on('uncaughtException', (err) => {
  console.error('[start] uncaughtException:', err.message);
  console.error(err.stack);
});

let handler = null;
let startupError = null;

const server = http.createServer((req, res) => {
  if (handler) {
    handler(req, res);
  } else {
    res.writeHead(startupError ? 500 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: startupError ? 'startup_error' : 'loading',
      error: startupError?.message,
      stack: startupError?.stack
    }));
  }
});

async function startServer() {
  const opts = { port: PORT, host: '0.0.0.0', reuseAddr: true };
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (err) => {
          server.off('error', onError);
          reject(err);
        };
        server.once('error', onError);
        server.listen(opts, () => {
          server.off('error', onError);
          console.log(`[start] HTTP server listening on 0.0.0.0:${PORT}`);
          resolve();
        });
      });
      return;
    } catch (err) {
      if (err.code === 'EADDRINUSE' && attempt < 5) {
        console.warn(`[start] Port ${PORT} in use, retry ${attempt}/5 in 15s...`);
        await new Promise((r) => setTimeout(r, 15000));
      } else {
        throw err;
      }
    }
  }
}
startServer().catch((err) => {
  console.error('[start] Failed to listen:', err.message);
  process.exit(1);
});

try {
  const mod = await import('./server.js');
  handler = mod.default;
  console.log('[start] Express app loaded successfully');
} catch (err) {
  startupError = err;
  console.error('[start] FATAL: Failed to load Express app:', err.message);
  console.error(err.stack);
}
