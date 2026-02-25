import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { sendAlertEmail } from './emailService.js';
import { sendWebhook } from './webhookService.js';

const PRICE_DROP_THRESHOLD = parseFloat(process.env.PRICE_DROP_ALERT_THRESHOLD) || 10;

/**
 * Check if a price drop should trigger an alert
 */
export async function checkPriceDrops(listingId, dropPct) {
  try {
    if (!dropPct || dropPct < PRICE_DROP_THRESHOLD) {
      return {
        shouldAlert: false,
        reason: dropPct < PRICE_DROP_THRESHOLD ? 'Below threshold' : 'No drop'
      };
    }

    // Get listing details
    const { data: listing, error } = await supabase
      .from('listings')
      .select('id, brand, model, year, price, url, price_drop_amount, price_drop_pct')
      .eq('id', listingId)
      .single();

    if (error || !listing) {
      logger.warn('Listing not found for price drop alert', { listingId, error: error?.message });
      return { shouldAlert: false, reason: 'Listing not found' };
    }

    return {
      shouldAlert: true,
      listing,
      dropPct
    };
  } catch (error) {
    logger.error('Error checking price drops', { error: error.message, listingId });
    throw error;
  }
}

/**
 * Get users following a specific model
 */
export async function getUsersFollowingModel(brand, model) {
  try {
    // Get alerts for this brand/model
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(`
        id,
        user_id,
        criteria,
        status,
        users:user_id (
          id,
          email,
          plan
        )
      `)
      .eq('status', 'active')
      .or(`criteria->>'brand'.ilike.${brand},criteria->>'model'.ilike.${model}`);

    if (error) {
      logger.error('Error fetching users following model', { error: error.message, brand, model });
      throw error;
    }

    const users = [];
    const seenUserIds = new Set();

    for (const alert of alerts || []) {
      if (!alert.users || seenUserIds.has(alert.user_id)) {
        continue;
      }

      // Check if alert criteria matches brand/model
      const criteria = alert.criteria || {};
      const alertBrand = (criteria.brand || '').toLowerCase();
      const alertModel = (criteria.model || '').toLowerCase();
      const targetBrand = brand.toLowerCase();
      const targetModel = model.toLowerCase();

      if (
        (alertBrand === targetBrand || alertBrand === '') &&
        (alertModel === targetModel || alertModel === '')
      ) {
        users.push({
          userId: alert.user_id,
          email: alert.users.email,
          plan: alert.users.plan,
          alertId: alert.id
        });
        seenUserIds.add(alert.user_id);
      }
    }

    return users;
  } catch (error) {
    logger.error('Error getting users following model', { error: error.message, brand, model });
    throw error;
  }
}

/**
 * Send price drop notifications (email and webhook)
 */
export async function sendPriceDropNotifications(listingId, dropData) {
  try {
    const { listing, dropPct } = await checkPriceDrops(listingId, dropData.dropPct);

    if (!listing || !listing.shouldAlert) {
      return {
        success: false,
        reason: listing?.reason || 'No alert needed'
      };
    }

    const users = await getUsersFollowingModel(listing.brand, listing.model);

    if (users.length === 0) {
      logger.info('No users following this model', {
        listingId,
        brand: listing.brand,
        model: listing.model
      });
      return {
        success: true,
        notified: 0,
        reason: 'No followers'
      };
    }

    const results = {
      emailsSent: 0,
      emailsFailed: 0,
      webhooksSent: 0,
      webhooksFailed: 0
    };

    // Send notifications to each user
    for (const user of users) {
      try {
        // Send email
        try {
          const emailSubject = `Baisse de prix détectée : ${listing.brand} ${listing.model}`;
          const emailBody = `
            <h2>Baisse de prix détectée</h2>
            <p>Une baisse de prix de ${dropPct.toFixed(1)}% a été détectée pour :</p>
            <ul>
              <li><strong>${listing.brand} ${listing.model}</strong> ${listing.year || ''}</li>
              <li>Prix actuel : ${parseFloat(listing.price).toLocaleString('fr-FR')} €</li>
              <li>Baisse : ${parseFloat(listing.price_drop_amount || 0).toLocaleString('fr-FR')} €</li>
            </ul>
            ${listing.url ? `<p><a href="${listing.url}">Voir l'annonce</a></p>` : ''}
          `;

          await sendEmail(user.email, emailSubject, emailBody);
          results.emailsSent++;
        } catch (emailError) {
          logger.error('Error sending price drop email', {
            error: emailError.message,
            userId: user.userId,
            email: user.email
          });
          results.emailsFailed++;
        }

        // Send webhook if configured
        const { data: alert } = await supabase
          .from('alerts')
          .select('webhook_url')
          .eq('id', user.alertId)
          .single();

        if (alert?.webhook_url) {
          try {
            const webhookPayload = {
              event_type: 'price_drop',
              alert_id: user.alertId,
              timestamp: new Date().toISOString(),
              data: {
                listing_id: listingId,
                brand: listing.brand,
                model: listing.model,
                year: listing.year,
                current_price: parseFloat(listing.price),
                previous_price: parseFloat(listing.price) + parseFloat(listing.price_drop_amount || 0),
                price_drop_amount: parseFloat(listing.price_drop_amount || 0),
                price_drop_percent: dropPct,
                url: listing.url
              }
            };

            await sendWebhook(alert.webhook_url, webhookPayload);
            results.webhooksSent++;
          } catch (webhookError) {
            logger.error('Error sending price drop webhook', {
              error: webhookError.message,
              userId: user.userId,
              webhookUrl: alert.webhook_url
            });
            results.webhooksFailed++;
          }
        }

        // Create alert event
        await supabase
          .from('alert_events')
          .insert({
            alert_id: user.alertId,
            user_id: user.userId,
            event_type: 'price_drop',
            data: {
              listing_id: listingId,
              drop_pct: dropPct,
              drop_amount: listing.price_drop_amount
            }
          });
      } catch (userError) {
        logger.error('Error processing user notification', {
          error: userError.message,
          userId: user.userId
        });
      }
    }

    logger.info('Price drop notifications sent', {
      listingId,
      totalUsers: users.length,
      results
    });

    return {
      success: true,
      notified: users.length,
      results
    };
  } catch (error) {
    logger.error('Error sending price drop notifications', {
      error: error.message,
      listingId
    });
    throw error;
  }
}
