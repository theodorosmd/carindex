import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupRoutes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupMonitoring } from './utils/monitoring.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
// CORS: FRONTEND_URL (single) or ALLOWED_ORIGINS (comma-separated)
const corsOrigin = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : (process.env.FRONTEND_URL || 'http://localhost:3000')
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, timestamp: new Date().toISOString() });
});

// API routes
setupRoutes(app);

// Error handling - must be last
app.use(errorHandler);

// Setup monitoring
setupMonitoring();

// When loaded directly (not via start.js), listen on PORT
if (process.argv[1]?.endsWith('server.js')) {
  function tryListen(retries = 3) {
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Carindex API server running on port ${PORT}`);
      console.log(`Server listening on 0.0.0.0:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && retries > 0) {
        server.close(() => {});
        logger.warn(`Port ${PORT} in use (hot-reload?), retrying in 2s...`, { retriesLeft: retries - 1 });
        setTimeout(() => tryListen(retries - 1), 2000);
      } else {
        throw err;
      }
    });
  }
  tryListen();
}

// Start cron jobs after server is ready
const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.ENABLE_CRON_JOBS !== 'false' && hasSupabase) {
  try {
    const { startCronJobs } = await import('./scripts/start-cron.js');
    startCronJobs();
  } catch (error) {
    logger.warn('Failed to start cron jobs', { error: error.message });
  }
} else if (!hasSupabase) {
  logger.warn('Cron jobs disabled: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
}

export default app;



