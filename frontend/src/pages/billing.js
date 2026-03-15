import { tr, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js';
import { isAuthenticated, getAuthToken } from '../main.js';
import { fetchSubscriptionStatus, redirectToCheckout, redirectToPortal } from '../utils/subscription.js';

// ─── render ───────────────────────────────────────────────────────────────────

export function renderBillingPage() {
  const app = document.getElementById('app');

  // Success/cancel banner from Stripe redirect
  const urlParams = new URLSearchParams(window.location.search);
  const successParam = urlParams.get('success');
  const planParam = urlParams.get('plan');

  app.innerHTML = `
    <header class="fixed inset-x-0 top-0 bg-white border-b border-zinc-200 z-50">
      <nav class="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/#/" class="flex items-center gap-2 shrink-0">
          <div class="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">C</span>
          </div>
          <span class="text-lg font-semibold text-zinc-900 tracking-tight">Carindex</span>
        </a>
        <div class="flex items-center gap-4">
          ${renderLanguageToggle()}
          <a href="/#/dashboard" class="text-sm px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition">
            ${tr('Dashboard', 'Dashboard')}
          </a>
        </div>
      </nav>
    </header>

    <div class="pt-[60px] min-h-screen bg-gray-50">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        <!-- Success banner -->
        ${successParam === '1' ? `
        <div id="success-banner" class="mb-8 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <p class="font-semibold text-green-900">
              ${planParam === 'dealer'
                ? tr('Welcome to Dealer! Your 14-day trial has started.', 'Bienvenue chez Dealer ! Votre essai de 14 jours a commencé.')
                : tr('Welcome to Pro! Your 7-day trial has started.', 'Bienvenue chez Pro ! Votre essai de 7 jours a commencé.')
              }
            </p>
            <p class="text-sm text-green-700 mt-0.5">
              ${tr('All premium features are now unlocked.', 'Toutes les fonctionnalités premium sont maintenant débloquées.')}
            </p>
          </div>
          <button onclick="this.closest('#success-banner').remove()" class="ml-auto text-green-500 hover:text-green-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>` : ''}

        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-zinc-900">${tr('Billing & Subscription', 'Facturation & Abonnement')}</h1>
          <p class="text-zinc-500 text-sm mt-1">${tr('Manage your plan and payment details.', 'Gérez votre abonnement et vos moyens de paiement.')}</p>
        </div>

        <!-- Plan card (loaded async) -->
        <div id="billing-plan-card" class="bg-white rounded-xl border border-zinc-200 p-6 mb-6">
          <div class="flex items-center gap-3 animate-pulse">
            <div class="h-8 w-24 bg-zinc-100 rounded-lg"></div>
            <div class="h-4 w-40 bg-zinc-100 rounded"></div>
          </div>
        </div>

        <!-- Upgrade options (shown only for starter) -->
        <div id="billing-upgrade-section" class="hidden">

          <h2 class="text-base font-semibold text-zinc-900 mb-4">${tr('Upgrade your plan', 'Passer à un plan supérieur')}</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <!-- Pro card -->
            <div class="bg-white border-2 border-blue-500 rounded-xl p-5 relative">
              <div class="absolute -top-3 left-4">
                <span class="bg-blue-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  ${tr('Most popular', 'Le plus populaire')}
                </span>
              </div>
              <div class="mt-1">
                <p class="font-bold text-zinc-900 text-lg">Pro</p>
                <p class="text-2xl font-bold text-zinc-900 mt-1">€19 <span class="text-sm font-normal text-zinc-500">/mo</span></p>
                <p class="text-xs text-zinc-500 mt-0.5">${tr('7-day free trial', 'Essai gratuit 7 jours')}</p>
              </div>
              <ul class="mt-4 space-y-2 text-sm text-zinc-600">
                <li class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  ${tr('Unlimited searches', 'Recherches illimitées')}
                </li>
                <li class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  ${tr('Exact market price', 'Prix marché exact')}
                </li>
                <li class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  ${tr('Full price history (12 mo)', 'Historique des prix (12 mois)')}
                </li>
                <li class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  ${tr('50 price alerts', '50 alertes de prix')}
                </li>
              </ul>
              <button
                id="upgrade-pro-btn"
                onclick="window.__billingCheckout('pro')"
                class="mt-5 w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                ${tr('Start 7-day free trial', 'Commencer l\'essai gratuit')}
              </button>
            </div>

            <!-- Dealer card -->
            <div class="bg-white border border-zinc-200 rounded-xl p-5 relative">
              <div class="mt-1">
                <p class="font-bold text-zinc-900 text-lg">Dealer</p>
                <p class="text-2xl font-bold text-zinc-900 mt-1">€129 <span class="text-sm font-normal text-zinc-500">/mo</span></p>
                <p class="text-xs text-zinc-500 mt-0.5">${tr('14-day free trial', 'Essai gratuit 14 jours')}</p>
              </div>
              <ul class="mt-4 space-y-2 text-sm text-zinc-600">
                <li class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  ${tr('Everything in Pro', 'Tout le plan Pro')}
                </li>
                <li class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  ${tr('Import arbitrage tool', "Outil d'arbitrage import")}
                </li>
                <li class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  ${tr('Batch CSV analysis', 'Analyse en lot CSV')}
                </li>
                <li class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  ${tr('3 team seats + API', '3 comptes équipe + API')}
                </li>
              </ul>
              <button
                id="upgrade-dealer-btn"
                onclick="window.__billingCheckout('dealer')"
                class="mt-5 w-full bg-zinc-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition"
              >
                ${tr('Start 14-day free trial', 'Commencer l\'essai gratuit')}
              </button>
            </div>

          </div>

          <p class="text-center text-xs text-zinc-400 mt-4">
            ${tr('No credit card required to start your trial.', 'Aucune carte bancaire requise pour démarrer l\'essai.')}
          </p>
        </div>

        <!-- Invoices / portal link (for paid users) -->
        <div id="billing-manage-section" class="hidden bg-white rounded-xl border border-zinc-200 p-6">
          <h2 class="font-semibold text-zinc-900 mb-1">${tr('Manage subscription', 'Gérer l\'abonnement')}</h2>
          <p class="text-sm text-zinc-500 mb-4">
            ${tr('Update payment method, download invoices, or cancel your plan.', 'Mettez à jour votre moyen de paiement, téléchargez vos factures ou annulez votre abonnement.')}
          </p>
          <button
            onclick="window.__billingPortal()"
            class="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            ${tr('Open billing portal', 'Ouvrir le portail de facturation')}
          </button>
        </div>

      </div>
    </div>
  `;

  attachLanguageToggle();

  // Expose handlers
  window.__billingCheckout = async (plan) => {
    const btn = document.getElementById(`upgrade-${plan}-btn`);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    await redirectToCheckout(plan);
    if (btn) { btn.disabled = false; btn.textContent = plan === 'pro' ? tr('Start 7-day free trial', "Commencer l'essai gratuit") : tr('Start 14-day free trial', "Commencer l'essai gratuit"); }
  };
  window.__billingPortal = async () => {
    const btn = document.querySelector('[onclick="window.__billingPortal()"]');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    await redirectToPortal();
  };

  // Load subscription status
  loadBillingStatus();
}

// ─── async loader ─────────────────────────────────────────────────────────────

async function loadBillingStatus() {
  const planCard = document.getElementById('billing-plan-card');
  const upgradeSection = document.getElementById('billing-upgrade-section');
  const manageSection = document.getElementById('billing-manage-section');

  const status = await fetchSubscriptionStatus();

  if (!status) {
    planCard.innerHTML = `
      <p class="text-sm text-zinc-500">${tr('Unable to load subscription details.', 'Impossible de charger les informations d\'abonnement.')}</p>
    `;
    return;
  }

  const { plan, status: subStatus, currentPeriodEnd, cancelAtPeriodEnd, trialEnd } = status;

  // Plan badge color
  const badgeColor = plan === 'dealer' || plan === 'plus'
    ? 'bg-purple-100 text-purple-700'
    : plan === 'pro'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-zinc-100 text-zinc-600';

  const planLabel = { starter: 'Starter', pro: 'Pro', dealer: 'Dealer', plus: 'Plus' }[plan] ?? plan;
  const statusLabel = subStatus === 'trialing'
    ? tr('Trial', 'Essai')
    : subStatus === 'active'
    ? tr('Active', 'Actif')
    : subStatus === 'past_due'
    ? tr('Payment due', 'Paiement en retard')
    : subStatus === 'canceled'
    ? tr('Canceled', 'Annulé')
    : subStatus === 'free'
    ? tr('Free', 'Gratuit')
    : subStatus;

  const statusColor = subStatus === 'active' || subStatus === 'trialing' || subStatus === 'free'
    ? 'bg-green-100 text-green-700'
    : subStatus === 'past_due'
    ? 'bg-red-100 text-red-700'
    : 'bg-zinc-100 text-zinc-500';

  // Dates
  let dateHtml = '';
  if (subStatus === 'trialing' && trialEnd) {
    const d = new Date(trialEnd).toLocaleDateString(tr('en-GB', 'fr-FR'), { day: 'numeric', month: 'long', year: 'numeric' });
    dateHtml = `<p class="text-sm text-zinc-500 mt-2">${tr('Trial ends', 'Essai se termine le')} <strong class="text-zinc-900">${d}</strong></p>`;
  } else if (currentPeriodEnd && subStatus !== 'free') {
    const d = new Date(currentPeriodEnd).toLocaleDateString(tr('en-GB', 'fr-FR'), { day: 'numeric', month: 'long', year: 'numeric' });
    dateHtml = cancelAtPeriodEnd
      ? `<p class="text-sm text-amber-600 mt-2">${tr('Cancels on', 'Se termine le')} <strong>${d}</strong></p>`
      : `<p class="text-sm text-zinc-500 mt-2">${tr('Renews on', 'Renouvellement le')} <strong class="text-zinc-900">${d}</strong></p>`;
  }

  planCard.innerHTML = `
    <div class="flex items-center gap-3 flex-wrap">
      <span class="text-base font-bold text-zinc-900">${tr('Current plan', 'Plan actuel')}</span>
      <span class="px-2.5 py-0.5 rounded-full text-sm font-semibold ${badgeColor}">${planLabel}</span>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">${statusLabel}</span>
    </div>
    ${dateHtml}
  `;

  // Show sections based on plan
  if (plan === 'starter') {
    upgradeSection.classList.remove('hidden');
  } else {
    manageSection.classList.remove('hidden');
  }
}
