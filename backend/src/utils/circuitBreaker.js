/**
 * In-memory circuit breaker per scraper source.
 * After MAX_FAILURES consecutive failures, the circuit opens for COOLDOWN_MS.
 * Automatically resets (half-open) after the cooldown expires.
 */
import { logger } from './logger.js';

const MAX_FAILURES = 3;
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/** @type {Map<string, { failures: number, openUntil: number|null }>} */
const state = new Map();

function getState(source) {
  if (!state.has(source)) state.set(source, { failures: 0, openUntil: null });
  return state.get(source);
}

/**
 * Returns true if the circuit is open (scraper should be skipped).
 * Automatically resets after cooldown expiry.
 */
export function isCircuitOpen(source) {
  const s = getState(source);
  if (!s.openUntil) return false;
  if (Date.now() < s.openUntil) return true;
  // Cooldown expired → half-open reset
  s.failures = 0;
  s.openUntil = null;
  logger.info(`Circuit breaker RESET for ${source} (cooldown expired)`);
  return false;
}

/** Call after a successful scraper run to reset failure count. */
export function recordSuccess(source) {
  const s = getState(source);
  if (s.failures > 0) {
    logger.info(`Circuit breaker: ${source} succeeded, resetting failures`);
  }
  s.failures = 0;
  s.openUntil = null;
}

/**
 * Call after a definitive scraper failure (all retries exhausted).
 * Opens the circuit after MAX_FAILURES consecutive failures.
 */
export function recordFailure(source) {
  const s = getState(source);
  s.failures++;
  if (s.failures >= MAX_FAILURES) {
    s.openUntil = Date.now() + COOLDOWN_MS;
    logger.warn(`Circuit breaker OPEN for ${source} (${s.failures} consecutive failures) — pausing 30 min`, {
      source,
      failures: s.failures,
      resumesAt: new Date(s.openUntil).toISOString()
    });
  } else {
    logger.warn(`Circuit breaker: ${source} failure ${s.failures}/${MAX_FAILURES}`, { source, failures: s.failures });
  }
}

/** Returns a snapshot of all circuit states (for monitoring/logging). */
export function getCircuitStates() {
  const result = {};
  for (const [source, s] of state.entries()) {
    result[source] = {
      failures: s.failures,
      open: s.openUntil != null && Date.now() < s.openUntil,
      openUntil: s.openUntil ? new Date(s.openUntil).toISOString() : null
    };
  }
  return result;
}
