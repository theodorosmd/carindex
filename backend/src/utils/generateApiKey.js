import crypto from 'crypto';

/**
 * Generate a secure API key for a user
 * @returns {string} API key in format: ck_live_xxxxxxxxxxxx
 */
export function generateApiKey() {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('hex');
  return `ck_live_${key}`;
}

/**
 * Generate a webhook secret
 * @returns {string} Webhook secret
 */
export function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}









