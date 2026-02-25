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
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
setupRoutes(app);

// Error handling - must be last
app.use(errorHandler);

// Setup monitoring
setupMonitoring();

// Start server FIRST so Railway sees a healthy process
app.listen(PORT, () => {
  logger.info(`Carindex API server running on port ${PORT}`);
  console.log(`Server running at http://localhost:${PORT}`);
});

// Start cron jobs AFTER the server is already listening
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



