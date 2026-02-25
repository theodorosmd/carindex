import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

export function setupMonitoring() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });

    logger.info('Sentry monitoring initialized');
  } else {
    logger.warn('Sentry DSN not configured, monitoring disabled');
  }
}









