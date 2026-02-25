import { logger } from '../utils/logger.js';

/**
 * Send webhook notification for alert events
 * @param {string} webhookUrl - The webhook URL to send the request to
 * @param {Object} payload - The payload to send
 * @param {number} timeout - Request timeout in milliseconds (default: 5000)
 * @returns {Promise<Object>} Response from webhook
 */
export async function sendWebhook(webhookUrl, payload, timeout = 5000) {
  try {
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      throw new Error('Invalid webhook URL');
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch (error) {
      throw new Error('Invalid webhook URL format');
    }

    logger.info('Sending webhook', {
      webhookUrl: webhookUrl.substring(0, 50) + '...', // Log partial URL for privacy
      payloadSize: JSON.stringify(payload).length
    });

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Carindex-Webhook/1.0',
          'X-Carindex-Event': payload.event_type || 'alert',
          'X-Carindex-Timestamp': new Date().toISOString()
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Webhook returned status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json().catch(() => ({}));

      logger.info('Webhook sent successfully', {
        webhookUrl: webhookUrl.substring(0, 50) + '...',
        status: response.status,
        responseSize: JSON.stringify(responseData).length
      });

      return {
        success: true,
        status: response.status,
        response: responseData
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error(`Webhook request timed out after ${timeout}ms`);
      }
      throw fetchError;
    }
  } catch (error) {
    logger.error('Error sending webhook', {
      error: error.message,
      webhookUrl: webhookUrl?.substring(0, 50) + '...'
    });
    throw error;
  }
}

/**
 * Send webhook for alert with retry logic
 * @param {string} webhookUrl - The webhook URL
 * @param {Object} alert - The alert object
 * @param {Array} listings - Array of new listings
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<Object>} Result of webhook send
 */
export async function sendAlertWebhook(webhookUrl, alert, listings, maxRetries = 3) {
  const payload = {
    event_type: 'alert.new_listings',
    alert: {
      id: alert.id,
      name: alert.name,
      type: alert.type,
      criteria: alert.criteria
    },
    listings: listings.map(listing => ({
      id: listing.id,
      url: listing.url,
      brand: listing.brand,
      model: listing.model,
      year: listing.year,
      mileage: listing.mileage,
      price: listing.price,
      currency: listing.currency || 'EUR',
      location: {
        city: listing.location_city,
        region: listing.location_region,
        country: listing.location_country
      },
      fuel_type: listing.fuel_type,
      transmission: listing.transmission,
      posted_date: listing.posted_date,
      images: listing.images || []
    })),
    timestamp: new Date().toISOString(),
    count: listings.length
  };

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendWebhook(webhookUrl, payload, 10000); // 10s timeout for webhooks
      return {
        success: true,
        attempt,
        ...result
      };
    } catch (error) {
      lastError = error;
      logger.warn(`Webhook attempt ${attempt}/${maxRetries} failed`, {
        error: error.message,
        webhookUrl: webhookUrl.substring(0, 50) + '...',
        alertId: alert.id
      });

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  return {
    success: false,
    attempts: maxRetries,
    error: lastError?.message || 'Unknown error'
  };
}







