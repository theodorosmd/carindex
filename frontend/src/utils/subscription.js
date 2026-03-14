/**
 * Subscription utilities — plan checks and Stripe redirect helpers.
 * Uses the user object stored in localStorage by the auth system.
 */

// ─── plan helpers ─────────────────────────────────────────────────────────────

export function getUserPlan() {
  try {
    const user = JSON.parse(localStorage.getItem('carindex_user') || '{}');
    return user?.plan ?? 'starter';
  } catch {
    return 'starter';
  }
}

export function isPro() {
  return ['pro', 'dealer', 'plus'].includes(getUserPlan());
}

export function isDealer() {
  return ['dealer', 'plus'].includes(getUserPlan());
}

export function isFree() {
  return getUserPlan() === 'starter';
}

// ─── Stripe redirects ─────────────────────────────────────────────────────────

function getAuthToken() {
  return localStorage.getItem('carindex_token');
}

/**
 * Redirect user to Stripe Checkout for the given plan ('pro' | 'dealer').
 * If not logged in, redirects to login first.
 */
export async function redirectToCheckout(plan) {
  const token = getAuthToken();
  if (!token) {
    window.location.href = `/login?redirect=${encodeURIComponent('/pricing')}`;
    return;
  }

  try {
    const res = await fetch('/api/v1/subscription/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data?.error?.code === 'BILLING_NOT_CONFIGURED') {
        alert('Billing is not yet configured. Please contact support.');
      } else {
        alert(data?.error?.message || 'Failed to start checkout. Please try again.');
      }
      return;
    }

    window.location.href = data.url;
  } catch (err) {
    console.error('redirectToCheckout error:', err);
    alert('Failed to connect to billing. Please try again.');
  }
}

/**
 * Redirect user to Stripe Customer Portal to manage their subscription.
 */
export async function redirectToPortal() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    const res = await fetch('/api/v1/subscription/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data?.error?.message || 'Failed to open billing portal.');
      return;
    }

    window.location.href = data.url;
  } catch (err) {
    console.error('redirectToPortal error:', err);
    alert('Failed to connect to billing. Please try again.');
  }
}

/**
 * Fetch live subscription status from backend.
 * Returns: { plan, status, currentPeriodEnd, cancelAtPeriodEnd, trialEnd, hasPaymentMethod }
 */
export async function fetchSubscriptionStatus() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/v1/subscription/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
