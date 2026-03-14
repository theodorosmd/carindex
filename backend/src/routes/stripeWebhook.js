import express from 'express';
import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
});

// Map Stripe price IDs → plan names (set at startup, read from env)
function getPlanFromPriceId(priceId) {
  if (priceId === process.env.STRIPE_PRICE_PRO_ID) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_DEALER_ID) return 'dealer';
  return null;
}

async function syncSubscription(stripeSubscription) {
  const userId = stripeSubscription.metadata?.carindex_user_id;
  if (!userId) {
    logger.warn('stripeWebhook: subscription missing carindex_user_id metadata', {
      subscriptionId: stripeSubscription.id,
    });
    return;
  }

  const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
  const plan = getPlanFromPriceId(priceId) ?? 'starter';

  const status = stripeSubscription.status; // active | trialing | past_due | canceled | incomplete
  const isActive = ['active', 'trialing'].includes(status);
  const effectivePlan = isActive ? plan : 'starter';

  const periodEnd = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
    : null;

  const trialEnd = stripeSubscription.trial_end
    ? new Date(stripeSubscription.trial_end * 1000).toISOString()
    : null;

  // Update users.plan
  await supabase
    .from('users')
    .update({ plan: effectivePlan, updated_at: new Date().toISOString() })
    .eq('id', userId);

  // Upsert subscriptions row
  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer,
      plan,
      status,
      current_period_end: periodEnd,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end ?? false,
      trial_end: trialEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' }
  );

  logger.info('stripeWebhook: synced subscription', {
    userId,
    plan: effectivePlan,
    status,
    subscriptionId: stripeSubscription.id,
  });
}

// POST /api/v1/stripe/webhook — raw body required (mounted before json parser)
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Skip signature verification if not configured (development)
  let event;
  if (webhookSecret && !webhookSecret.includes('placeholder')) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.warn('stripeWebhook: signature verification failed', { error: err.message });
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  } else {
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Retrieve full subscription to get metadata + price info
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['items.data.price'],
          });
          // Copy user metadata from session to subscription if missing
          if (!sub.metadata?.carindex_user_id && session.metadata?.carindex_user_id) {
            await stripe.subscriptions.update(session.subscription, {
              metadata: { carindex_user_id: session.metadata.carindex_user_id },
            });
            sub.metadata = session.metadata;
          }
          await syncSubscription(sub);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = await stripe.subscriptions.retrieve(event.data.object.id, {
          expand: ['items.data.price'],
        });
        await syncSubscription(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.carindex_user_id;
        if (userId) {
          await supabase
            .from('users')
            .update({ plan: 'starter', updated_at: new Date().toISOString() })
            .eq('id', userId);
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', sub.id);
          logger.info('stripeWebhook: subscription cancelled, downgraded to starter', { userId });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('stripeWebhook: handler error', { error: error.message, eventType: event.type });
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export const stripeWebhookRoutes = router;
