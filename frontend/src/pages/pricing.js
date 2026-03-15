import { tr, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js';
import { isAuthenticated } from '../main.js';
import { getUserPlan, redirectToCheckout } from '../utils/subscription.js';

// ─── feature lists ────────────────────────────────────────────────────────────

const FEATURES = {
  starter: [
    { text: () => tr('200 searches / month', '200 recherches / mois'), included: true },
    { text: () => tr('Basic deal score', 'Score deal basique'), included: true },
    { text: () => tr('Estimated market price', 'Prix marché estimé'), included: true },
    { text: () => tr('10 saved searches', '10 recherches sauvegardées'), included: true },
    { text: () => tr('10 price alerts', '10 alertes de prix'), included: true },
    { text: () => tr('Full price history', 'Historique complet des prix'), included: false },
    { text: () => tr('Depreciation curves', 'Courbes de dépréciation'), included: false },
    { text: () => tr('Ownership cost calculator', 'Calculateur de TCO'), included: false },
    { text: () => tr('Import arbitrage', "Arbitrage d'import"), included: false },
    { text: () => tr('Market dashboard', 'Tableau de bord marché'), included: false },
  ],
  pro: [
    { text: () => tr('Unlimited searches', 'Recherches illimitées'), included: true },
    { text: () => tr('Full numeric deal score', 'Score deal numérique complet'), included: true },
    { text: () => tr('Exact market price', 'Prix marché exact'), included: true },
    { text: () => tr('Unlimited saved searches', 'Recherches sauvegardées illimitées'), included: true },
    { text: () => tr('50 price alerts', '50 alertes de prix'), included: true },
    { text: () => tr('Full price history (12 months)', 'Historique des prix (12 mois)'), included: true },
    { text: () => tr('Depreciation curves (3 years)', 'Dépréciation sur 3 ans'), included: true },
    { text: () => tr('Ownership cost calculator', 'Calculateur de TCO'), included: true },
    { text: () => tr('Import arbitrage', "Arbitrage d'import"), included: false },
    { text: () => tr('Market dashboard', 'Tableau de bord marché'), included: false },
  ],
  dealer: [
    { text: () => tr('Everything in Pro', 'Tout le plan Pro'), included: true },
    { text: () => tr('Unlimited alerts', 'Alertes illimitées'), included: true },
    { text: () => tr('Import arbitrage tool', "Outil d'arbitrage import"), included: true },
    { text: () => tr('Market dashboard & price drops', 'Dashboard marché & baisses de prix'), included: true },
    { text: () => tr('Batch analysis (CSV upload)', 'Analyse en lot (import CSV)'), included: true },
    { text: () => tr('CSV data export', "Export CSV des données"), included: true },
    { text: () => tr('3 team seats', '3 comptes équipe'), included: true },
    { text: () => tr('Priority support', 'Support prioritaire'), included: true },
    { text: () => tr('API-lite (1,000 calls/mo)', 'API-lite (1 000 appels/mois)'), included: true },
    { text: () => tr('Price drop alerts (live feed)', 'Alertes baisses de prix (flux live)'), included: true },
  ],
};

// ─── render ───────────────────────────────────────────────────────────────────

export function renderPricingPage() {
  const app = document.getElementById('app');
  const currentPlan = getUserPlan();

  app.innerHTML = `
    <header class="fixed inset-x-0 top-0 bg-white border-b border-zinc-200 z-50">
      <nav class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2 shrink-0">
          <div class="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">C</span>
          </div>
          <span class="text-lg font-semibold text-zinc-900 tracking-tight">Carindex</span>
        </a>
        <div class="flex items-center gap-4">
          ${renderLanguageToggle()}
          <a href="/search" class="text-sm text-zinc-500 hover:text-zinc-900 transition hidden sm:inline">${tr('Search', 'Rechercher')}</a>
          ${isAuthenticated()
            ? `<a href="/dashboard" class="text-sm px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition">${tr('Dashboard', 'Dashboard')}</a>`
            : `<a href="/login" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Log in', 'Connexion')}</a>
               <a href="/signup" class="text-sm px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition">${tr('Sign up free', "S'inscrire")}</a>`
          }
        </div>
      </nav>
    </header>
    <div class="pt-[60px] min-h-screen bg-gray-50">
      <div class="container mx-auto px-4 sm:px-6 py-12">

        <!-- Header -->
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            ${tr('Simple, transparent pricing', 'Des tarifs simples et transparents')}
          </h1>
          <p class="text-lg text-gray-500 max-w-xl mx-auto">
            ${tr(
              'Stop guessing what a car is worth. Know exactly before you negotiate.',
              "Arrêtez de deviner ce que vaut une voiture. Sachez-le exactement avant de négocier."
            )}
          </p>

          <!-- Annual toggle -->
          <div class="flex items-center justify-center gap-3 mt-8">
            <span id="billing-monthly-label" class="text-sm font-medium text-gray-900">
              ${tr('Monthly', 'Mensuel')}
            </span>
            <button
              id="billing-toggle"
              onclick="toggleBilling()"
              class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none"
              role="switch" aria-checked="false"
            >
              <span id="billing-toggle-thumb" class="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white transition-transform"></span>
            </button>
            <span id="billing-annual-label" class="text-sm font-medium text-gray-400">
              ${tr('Annual', 'Annuel')}
              <span class="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ${tr('Save 20%', 'Économisez 20%')}
              </span>
            </span>
          </div>
        </div>

        <!-- Pricing cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">

          <!-- Starter (Free) -->
          ${renderPlanCard({
            plan: 'starter',
            name: tr('Starter', 'Gratuit'),
            badge: null,
            monthlyPrice: 0,
            annualPrice: 0,
            description: tr('For curious buyers exploring the market.', "Pour les acheteurs qui explorent le marché."),
            ctaLabel: currentPlan === 'starter'
              ? tr('Your current plan', 'Votre plan actuel')
              : tr('Get started free', 'Commencer gratuitement'),
            ctaDisabled: currentPlan === 'starter',
            ctaAction: currentPlan === 'starter' ? '' : "window.location.href='/signup'",
            highlighted: false,
            currentPlan,
          })}

          <!-- Pro -->
          ${renderPlanCard({
            plan: 'pro',
            name: 'Pro',
            badge: tr('Most popular', 'Le plus populaire'),
            monthlyPrice: 19,
            annualPrice: 15,
            description: tr('For serious buyers who want certainty before they negotiate.', 'Pour les acheteurs sérieux qui veulent être sûrs avant de négocier.'),
            ctaLabel: currentPlan === 'pro'
              ? tr('Your current plan', 'Votre plan actuel')
              : tr('Start 7-day free trial', "Essayer 7 jours gratuit"),
            ctaDisabled: currentPlan === 'pro',
            ctaAction: currentPlan === 'pro' ? '' : "window.startCheckout('pro')",
            highlighted: true,
            currentPlan,
          })}

          <!-- Dealer -->
          ${renderPlanCard({
            plan: 'dealer',
            name: 'Dealer',
            badge: tr('Best for professionals', 'Idéal pour les pros'),
            monthlyPrice: 129,
            annualPrice: 99,
            description: tr('For dealers, traders and importers who need a market edge every day.', 'Pour les professionnels qui ont besoin d\'un avantage marché chaque jour.'),
            ctaLabel: isCurrentOrHigher(currentPlan, 'dealer')
              ? tr('Your current plan', 'Votre plan actuel')
              : tr('Start 14-day free trial', "Essayer 14 jours gratuit"),
            ctaDisabled: isCurrentOrHigher(currentPlan, 'dealer'),
            ctaAction: isCurrentOrHigher(currentPlan, 'dealer') ? '' : "window.startCheckout('dealer')",
            highlighted: false,
            currentPlan,
          })}

        </div>

        <!-- Feature comparison table -->
        <div class="mt-16 max-w-4xl mx-auto">
          <h2 class="text-2xl font-bold text-gray-900 text-center mb-8">
            ${tr('Full feature comparison', 'Comparaison complète des fonctionnalités')}
          </h2>
          ${renderComparisonTable()}
        </div>

        <!-- FAQ -->
        <div class="mt-16 max-w-2xl mx-auto">
          <h2 class="text-2xl font-bold text-gray-900 text-center mb-8">FAQ</h2>
          ${renderFAQ()}
        </div>

      </div>
    </div>
  `;

  // Expose global handlers
  window.toggleBilling = toggleBilling;
  window.startCheckout = startCheckout;
  attachLanguageToggle();
}

// ─── sub-renderers ────────────────────────────────────────────────────────────

function isCurrentOrHigher(current, target) {
  const rank = { starter: 0, pro: 1, plus: 2, dealer: 2 };
  return (rank[current] ?? 0) >= (rank[target] ?? 0);
}

function renderPlanCard({ plan, name, badge, monthlyPrice, annualPrice, description, ctaLabel, ctaDisabled, ctaAction, highlighted, currentPlan }) {
  const isCurrent = currentPlan === plan || (plan === 'dealer' && ['dealer', 'plus'].includes(currentPlan));

  const borderClass = highlighted
    ? 'border-2 border-blue-600 shadow-xl'
    : isCurrent
      ? 'border-2 border-green-500 shadow-md'
      : 'border border-gray-200 shadow-sm';

  const badgeHtml = badge
    ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold ${highlighted ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'} whitespace-nowrap">${badge}</div>`
    : '';

  const priceHtml = monthlyPrice === 0
    ? `<span class="text-4xl font-bold text-gray-900">${tr('Free', 'Gratuit')}</span>`
    : `
      <div>
        <span id="price-monthly-${plan}" class="text-4xl font-bold text-gray-900">€${monthlyPrice}</span>
        <span id="price-annual-${plan}" class="text-4xl font-bold text-gray-900 hidden">€${annualPrice}</span>
        <span class="text-gray-500 text-sm">/ ${tr('month', 'mois')}</span>
      </div>
      <p id="annual-note-${plan}" class="text-xs text-gray-400 mt-1 hidden">
        ${tr(`Billed €${annualPrice * 12}/year`, `Facturé €${annualPrice * 12}/an`)}
      </p>
    `;

  const featuresHtml = FEATURES[plan].map(f => `
    <li class="flex items-start gap-2 text-sm ${f.included ? 'text-gray-700' : 'text-gray-400 line-through'}">
      <span class="flex-shrink-0 mt-0.5 ${f.included ? 'text-green-500' : 'text-gray-300'}">
        ${f.included
          ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>'
          : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
        }
      </span>
      ${f.text()}
    </li>
  `).join('');

  const ctaBtnClass = ctaDisabled
    ? 'w-full py-3 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-default'
    : highlighted
      ? 'w-full py-3 px-4 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer'
      : 'w-full py-3 px-4 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer';

  return `
    <div class="relative bg-white rounded-2xl p-8 flex flex-col ${borderClass}">
      ${badgeHtml}
      <div class="mb-6">
        <h3 class="text-xl font-bold text-gray-900 mb-1">${name}</h3>
        <p class="text-sm text-gray-500">${description}</p>
      </div>
      <div class="mb-6">${priceHtml}</div>
      <button
        ${ctaDisabled ? 'disabled' : `onclick="${ctaAction}"`}
        class="${ctaBtnClass}"
      >
        ${ctaLabel}
      </button>
      <ul class="mt-6 space-y-3">
        ${featuresHtml}
      </ul>
    </div>
  `;
}

function renderComparisonTable() {
  const rows = [
    { label: () => tr('Searches / month', 'Recherches / mois'), starter: '200', pro: tr('Unlimited', 'Illimité'), dealer: tr('Unlimited', 'Illimité') },
    { label: () => tr('Deal score', 'Score deal'), starter: tr('Basic', 'Basique'), pro: tr('Full numeric', 'Numérique complet'), dealer: tr('Full numeric', 'Numérique complet') },
    { label: () => tr('Price history', 'Historique des prix'), starter: false, pro: tr('12 months', '12 mois'), dealer: tr('12 months', '12 mois') },
    { label: () => tr('Depreciation curve', 'Courbe de dépréciation'), starter: false, pro: true, dealer: true },
    { label: () => tr('Ownership cost', 'Coût de possession'), starter: false, pro: true, dealer: true },
    { label: () => tr('Saved searches', 'Recherches sauvegardées'), starter: '10', pro: '∞', dealer: '∞' },
    { label: () => tr('Price alerts', 'Alertes de prix'), starter: '10', pro: '50', dealer: '∞' },
    { label: () => tr('Import arbitrage', "Arbitrage d'import"), starter: false, pro: false, dealer: true },
    { label: () => tr('Market dashboard', 'Tableau de bord marché'), starter: false, pro: false, dealer: true },
    { label: () => tr('Batch CSV analysis', 'Analyse CSV en lot'), starter: false, pro: false, dealer: true },
    { label: () => tr('CSV export', 'Export CSV'), starter: false, pro: false, dealer: true },
    { label: () => tr('Team seats', "Comptes d'équipe"), starter: '1', pro: '1', dealer: '3' },
  ];

  const check = `<svg class="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`;
  const cross = `<span class="text-gray-300 text-lg mx-auto block text-center">—</span>`;

  const cell = (val) => {
    if (val === true) return check;
    if (val === false) return cross;
    return `<span class="text-sm text-gray-700 text-center block">${val}</span>`;
  };

  return `
    <div class="overflow-x-auto rounded-xl border border-gray-200">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200">
            <th class="text-left py-3 px-4 font-semibold text-gray-600 w-1/2">${tr('Feature', 'Fonctionnalité')}</th>
            <th class="py-3 px-4 font-semibold text-gray-600 text-center">Starter</th>
            <th class="py-3 px-4 font-semibold text-blue-700 text-center">Pro</th>
            <th class="py-3 px-4 font-semibold text-gray-600 text-center">Dealer</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => `
            <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100">
              <td class="py-3 px-4 text-gray-700">${row.label()}</td>
              <td class="py-3 px-4">${cell(row.starter)}</td>
              <td class="py-3 px-4 bg-blue-50/30">${cell(row.pro)}</td>
              <td class="py-3 px-4">${cell(row.dealer)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFAQ() {
  const items = [
    {
      q: () => tr('Which countries are covered?', 'Quels pays sont couverts ?'),
      a: () => tr(
        'Carindex covers 13 European countries: France, Germany, Belgium, Netherlands, Spain, Italy, Sweden, Norway, Finland, Denmark, Switzerland, Luxembourg and Poland. We add new markets based on demand.',
        'Carindex couvre 13 pays européens : France, Allemagne, Belgique, Pays-Bas, Espagne, Italie, Suède, Norvège, Finlande, Danemark, Suisse, Luxembourg et Pologne. Nous ajoutons de nouveaux marchés selon la demande.'
      ),
    },
    {
      q: () => tr('How accurate are the market prices?', 'Quelle est la précision des prix de marché ?'),
      a: () => tr(
        'Each market price is calculated from real comparable listings and comes with a confidence index (0–100%). The more listings available for a model, the higher the confidence. Rare or very recent models may have a lower confidence score.',
        'Chaque prix de marché est calculé à partir d\'annonces réelles comparables et accompagné d\'un indice de confiance (0–100 %). Plus il y a d\'annonces pour un modèle, plus la confiance est élevée. Les modèles rares ou très récents peuvent avoir un score plus faible.'
      ),
    },
    {
      q: () => tr('How often is data updated?', 'À quelle fréquence les données sont-elles mises à jour ?'),
      a: () => tr(
        'Listings are refreshed daily from all covered markets. Price alerts are checked every hour. Historical trend data covers up to 30 months.',
        'Les annonces sont actualisées quotidiennement depuis tous les marchés couverts. Les alertes de prix sont vérifiées toutes les heures. Les données historiques de tendance couvrent jusqu\'à 30 mois.'
      ),
    },
    {
      q: () => tr('Is there a commitment period?', 'Y a-t-il un engagement ?'),
      a: () => tr(
        'No commitment. Cancel anytime from your billing page. Pro includes a 7-day free trial, Dealer a 14-day free trial. You keep access until the end of the current billing period.',
        'Aucun engagement. Annulez à tout moment depuis votre page facturation. Pro inclut 7 jours d\'essai gratuit, Dealer 14 jours. Vous gardez l\'accès jusqu\'à la fin de la période en cours.'
      ),
    },
  ];

  return items.map((item, i) => `
    <div class="${i > 0 ? 'border-t border-gray-200' : ''} py-5">
      <h3 class="font-semibold text-gray-900 mb-2">${item.q()}</h3>
      <p class="text-gray-500 text-sm leading-relaxed">${item.a()}</p>
    </div>
  `).join('');
}

// ─── event handlers ───────────────────────────────────────────────────────────

let isAnnual = false;

function toggleBilling() {
  isAnnual = !isAnnual;
  const toggle = document.getElementById('billing-toggle');
  const thumb = document.getElementById('billing-toggle-thumb');
  const monthlyLabel = document.getElementById('billing-monthly-label');
  const annualLabel = document.getElementById('billing-annual-label');

  toggle.setAttribute('aria-checked', isAnnual.toString());
  toggle.classList.toggle('bg-blue-600', isAnnual);
  toggle.classList.toggle('bg-gray-200', !isAnnual);
  thumb.classList.toggle('translate-x-6', isAnnual);
  thumb.classList.toggle('translate-x-1', !isAnnual);
  monthlyLabel.classList.toggle('text-gray-400', isAnnual);
  monthlyLabel.classList.toggle('text-gray-900', !isAnnual);
  annualLabel.classList.toggle('text-gray-400', !isAnnual);
  annualLabel.classList.toggle('text-gray-900', isAnnual);

  for (const plan of ['pro', 'dealer']) {
    document.getElementById(`price-monthly-${plan}`)?.classList.toggle('hidden', isAnnual);
    document.getElementById(`price-annual-${plan}`)?.classList.toggle('hidden', !isAnnual);
    document.getElementById(`annual-note-${plan}`)?.classList.toggle('hidden', !isAnnual);
  }
}

async function startCheckout(plan) {
  const btn = event?.target;
  if (btn) {
    btn.disabled = true;
    btn.textContent = tr('Redirecting…', 'Redirection…');
  }
  await redirectToCheckout(plan);
  if (btn) {
    btn.disabled = false;
    btn.textContent = plan === 'pro'
      ? tr('Start 7-day free trial', 'Essayer 7 jours gratuit')
      : tr('Start 14-day free trial', 'Essayer 14 jours gratuit');
  }
}
