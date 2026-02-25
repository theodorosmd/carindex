import { getActiveAlerts, checkNewListingsForAlert, createAlertEvent } from '../services/alertsService.js';
import { sendAlertEmail } from '../services/emailService.js';
import { sendAlertWebhook } from '../services/webhookService.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Check all active alerts and send emails for new listings
 */
export async function checkAlerts() {
  try {
    logger.info('Starting alert check job');

    // Get all active alerts
    const alerts = await getActiveAlerts();
    logger.info(`Found ${alerts.length} active alerts to check`);

    let totalEmailsSent = 0;
    let totalListingsFound = 0;

    for (const alert of alerts) {
      try {
        // Get user email from alert (alerts should include user data)
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', alert.user_id)
          .single();

        if (userError || !user) {
          logger.warn('User not found for alert', { alertId: alert.id, userId: alert.user_id });
          continue;
        }

        // Check for new listings matching alert criteria
        const newListings = await checkNewListingsForAlert(alert);

        if (newListings.length === 0) {
          logger.debug('No new listings for alert', { alertId: alert.id, alertName: alert.name });
          continue;
        }

        logger.info(`Found ${newListings.length} new listings for alert`, {
          alertId: alert.id,
          alertName: alert.name,
          userEmail: user.email
        });

        // Create alert events for each new listing
        for (const listing of newListings) {
          try {
            await createAlertEvent(
              alert.id,
              alert.user_id,
              'new_listing',
              {
                listing_id: listing.id,
                listing_url: listing.url,
                brand: listing.brand,
                model: listing.model,
                year: listing.year,
                price: listing.price
              }
            );
          } catch (eventError) {
            logger.error('Error creating alert event', {
              error: eventError.message,
              alertId: alert.id,
              listingId: listing.id
            });
          }
        }

        // Send notifications based on alert configuration
        // Premium plans can have webhooks, all plans get emails
        let emailSent = false;
        let webhookSent = false;

        // Send email (for all plans)
        try {
          await sendAlertEmail(user.email, alert.name, newListings);
          emailSent = true;
          totalEmailsSent++;
          totalListingsFound += newListings.length;
          logger.info('Alert email sent successfully', {
            alertId: alert.id,
            userEmail: user.email,
            listingsCount: newListings.length
          });
        } catch (emailError) {
          logger.error('Error sending alert email', {
            error: emailError.message,
            alertId: alert.id,
            userEmail: user.email
          });
        }

        // Send webhook if configured (premium feature)
        if (alert.webhook_url) {
          try {
            const webhookResult = await sendAlertWebhook(alert.webhook_url, alert, newListings);
            if (webhookResult.success) {
              webhookSent = true;
              logger.info('Alert webhook sent successfully', {
                alertId: alert.id,
                webhookUrl: alert.webhook_url.substring(0, 50) + '...',
                listingsCount: newListings.length,
                attempts: webhookResult.attempt
              });
            } else {
              logger.warn('Alert webhook failed after retries', {
                alertId: alert.id,
                webhookUrl: alert.webhook_url.substring(0, 50) + '...',
                attempts: webhookResult.attempts,
                error: webhookResult.error
              });
            }
          } catch (webhookError) {
            logger.error('Error sending alert webhook', {
              error: webhookError.message,
              alertId: alert.id,
              webhookUrl: alert.webhook_url.substring(0, 50) + '...'
            });
          }
        }

      } catch (alertError) {
        logger.error('Error processing alert', {
          error: alertError.message,
          alertId: alert.id,
          alertName: alert.name
        });
        // Continue with next alert
        continue;
      }
    }

    logger.info('Alert check job completed', {
      alertsChecked: alerts.length,
      emailsSent: totalEmailsSent,
      totalListingsFound
    });

    return {
      success: true,
      alertsChecked: alerts.length,
      emailsSent: totalEmailsSent,
      totalListingsFound
    };
  } catch (error) {
    logger.error('Error in alert check job', { error: error.message, stack: error.stack });
    throw error;
  }
}

