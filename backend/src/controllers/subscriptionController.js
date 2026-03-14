import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
});

const PLAN_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO_ID,
  dealer: process.env.STRIPE_PRICE_DEALER_ID,
};

const PLAN_TRIAL_DAYS = {
  pro: 7,
  dealer: 14,
};

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateStripeCustomer(userId, email) {
  // Check if user already has a Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (user?.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { carindex_user_id: userId },
  });

  // Save customer ID
  await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

// ─── controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/subscription/checkout
 * Body: { plan: 'pro' | 'dealer' }
 * Returns: { url } — Stripe Checkout URL
 */
export async function createCheckoutSession(req, res, next) {
  try {
    const { plan } = req.body;
    const { id: userId, email } = req.user;

    if (!['pro', 'dealer'].includes(plan)) {
      return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Plan must be pro or dealer' } });
    }

    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId || priceId.includes('placeholder')) {
      return res.status(503).json({
        error: { code: 'BILLING_NOT_CONFIGURED', message: 'Billing is not configured yet. Please add your Stripe price IDs.' }
      });
    }

    const customerId = await getOrCreateStripeCustomer(userId, email);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: PLAN_TRIAL_DAYS[plan],
        metadata: { carindex_user_id: userId, plan },
      },
      success_url: `${frontendUrl}/billing?success=1&plan=${plan}`,
      cancel_url: `${frontendUrl}/pricing`,
      allow_promotion_codes: true,
      metadata: { carindex_user_id: userId, plan },
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('createCheckoutSession error', { error: error.message });
    next(error);
  }
}

/**
 * POST /api/v1/subscription/portal
 * Returns: { url } — Stripe Customer Portal URL
 */
export async function createPortalSession(req, res, next) {
  try {
    const { id: userId } = req.user;

    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return res.status(404).json({
        error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' }
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${frontendUrl}/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('createPortalSession error', { error: error.message });
    next(error);
  }
}

/**
 * GET /api/v1/subscription/status
 * Returns current subscription info for logged-in user
 */
export async function getSubscriptionStatus(req, res, next) {
  try {
    const { id: userId } = req.user;

    const [userResult, subResult] = await Promise.all([
      supabase.from('users').select('plan, stripe_customer_id').eq('id', userId).single(),
      supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, cancel_at_period_end, trial_end')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const currentPlan = userResult.data?.plan ?? 'starter';
    const sub = subResult.data;

    res.json({
      plan: currentPlan,
      status: sub?.status ?? (currentPlan === 'starter' ? 'free' : 'active'),
      currentPeriodEnd: sub?.current_period_end ?? null,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      trialEnd: sub?.trial_end ?? null,
      hasPaymentMethod: !!userResult.data?.stripe_customer_id,
    });
  } catch (error) {
    logger.error('getSubscriptionStatus error', { error: error.message });
    next(error);
  }
}

/**
 * GET /api/v1/subscription/config
 * Returns public Stripe config for frontend (publishable key)
 */
export async function getStripeConfig(req, res) {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    configured: !!(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder')),
  });
}
