import { tr, getLang, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js'
import { isAuthenticated } from '../main.js'

// ─── Cost data tables ──────────────────────────────────────────────────────────

// Annual insurance estimates by country (€/year, comprehensive for a mid-range car)
const INSURANCE_BY_COUNTRY = {
  FR: { min: 600, avg: 900,  max: 1400 },
  DE: { min: 500, avg: 800,  max: 1300 },
  BE: { min: 700, avg: 1000, max: 1600 },
  NL: { min: 600, avg: 900,  max: 1400 },
  SE: { min: 400, avg: 700,  max: 1100 },
  IT: { min: 800, avg: 1200, max: 2000 },
  ES: { min: 500, avg: 750,  max: 1200 },
  AT: { min: 500, avg: 800,  max: 1300 },
  GB: { min: 700, avg: 1100, max: 1800 },
  CH: { min: 800, avg: 1200, max: 1900 },
  PL: { min: 300, avg: 500,  max: 900  },
  PT: { min: 400, avg: 650,  max: 1100 },
}

// Fuel cost per 100km (€) based on type + country avg pump price
const FUEL_COST_PER_100KM = {
  petrol:   { consumption: 7.0, price_eur_l: 1.65 },  // 7L/100km @ €1.65/L
  diesel:   { consumption: 5.5, price_eur_l: 1.55 },  // 5.5L/100km @ €1.55/L
  electric: { consumption: 18,  price_eur_l: 0.20 },  // 18kWh/100km @ €0.20/kWh
  hybrid:   { consumption: 5.0, price_eur_l: 1.65 },  // better mpg hybrid
}

// Annual maintenance estimate (€) — varies by brand tier
const MAINTENANCE_BY_BRAND_TIER = {
  budget:   { label: 'Budget (Dacia, Skoda, Seat)',     annual: 600  },
  mid:      { label: 'Mid-range (VW, Ford, Toyota)',    annual: 900  },
  premium:  { label: 'Premium (BMW, Mercedes, Audi)',   annual: 1400 },
  luxury:   { label: 'Luxury / Sports',                 annual: 2200 },
}

const BRAND_TIER = {
  'dacia': 'budget', 'skoda': 'budget', 'seat': 'budget', 'opel': 'budget', 'fiat': 'budget',
  'ford': 'mid', 'volkswagen': 'mid', 'peugeot': 'mid', 'renault': 'mid', 'toyota': 'mid',
  'honda': 'mid', 'hyundai': 'mid', 'kia': 'mid', 'nissan': 'mid', 'mazda': 'mid',
  'bmw': 'premium', 'mercedes-benz': 'premium', 'audi': 'premium', 'lexus': 'premium',
  'volvo': 'premium', 'jaguar': 'luxury', 'land rover': 'luxury', 'porsche': 'luxury',
  'ferrari': 'luxury', 'lamborghini': 'luxury', 'maserati': 'luxury',
}

function getBrandTier(brand) {
  return BRAND_TIER[(brand || '').toLowerCase()] || 'mid'
}

// Annual depreciation % by age
function getDepreciationPct(year) {
  const age = new Date().getFullYear() - year
  if (age <= 1)  return 15
  if (age <= 3)  return 10
  if (age <= 6)  return 7
  if (age <= 10) return 5
  return 3
}

function fmtEUR(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

// ─── render ───────────────────────────────────────────────────────────────────

export function renderOwnershipCost() {
  const app = document.getElementById('app')

  const currentYear = new Date().getFullYear()
  const yearOpts = Array.from({ length: 25 }, (_, i) => currentYear - i)
    .map(y => `<option value="${y}">${y}</option>`).join('')

  const countryOpts = [
    ['', tr('Select country', 'Choisir le pays')],
    ['FR', 'France'], ['DE', 'Germany'], ['BE', 'Belgium'],
    ['NL', 'Netherlands'], ['SE', 'Sweden'], ['IT', 'Italy'],
    ['ES', 'Spain'], ['AT', 'Austria'], ['GB', 'United Kingdom'],
    ['CH', 'Switzerland'], ['PL', 'Poland'], ['PT', 'Portugal'],
  ].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')

  app.innerHTML = `
    <header class="fixed inset-x-0 top-0 bg-white border-b border-zinc-200 z-50">
      <nav class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#/" class="flex items-center gap-2 shrink-0">
          <div class="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">C</span>
          </div>
          <span class="text-lg font-semibold text-zinc-900 tracking-tight">Carindex</span>
        </a>
        <div class="flex items-center gap-4">
          ${renderLanguageToggle()}
          <a href="#/deal-score" class="text-sm text-zinc-500 hover:text-zinc-900 transition hidden sm:inline">Deal Score</a>
          <a href="#/search" class="text-sm text-zinc-500 hover:text-zinc-900 transition hidden sm:inline">${tr('Search', 'Rechercher')}</a>
          ${isAuthenticated()
            ? `<a href="#/dashboard" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Dashboard', 'Dashboard')}</a>`
            : `<a href="#/login" class="px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition">${tr('Sign in', 'Se connecter')}</a>`
          }
        </div>
      </nav>
    </header>

    <main class="pt-[60px] min-h-screen bg-zinc-50">
      <div class="max-w-3xl mx-auto px-4 py-12">

        <div class="text-center mb-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-xs font-medium text-zinc-600 mb-4">
            💶 ${tr('Total Cost of Ownership', 'Coût total de possession')}
          </div>
          <h1 class="text-3xl sm:text-4xl font-bold text-zinc-900 mb-3">
            ${tr('What does owning this car really cost?', 'Combien coûte vraiment cette voiture par an\u00a0?')}
          </h1>
          <p class="text-zinc-500 text-base">
            ${tr('Beyond the sticker price — insurance, fuel, maintenance, depreciation.', 'Au-delà du prix d\'achat — assurance, carburant, entretien, dépréciation.')}
          </p>
        </div>

        <!-- Form -->
        <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-6">
          <div class="grid grid-cols-2 gap-4 mb-5">

            <div class="col-span-2 sm:col-span-1">
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Purchase price (€)', 'Prix d\'achat (€)')}</label>
              <input id="oc-price" type="number" min="500" step="500" placeholder="e.g. 15000"
                class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>

            <div class="col-span-2 sm:col-span-1">
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Year', 'Année')}</label>
              <select id="oc-year" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                <option value="">${tr('Select year', 'Choisir l\'année')}</option>
                ${yearOpts}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Fuel type', 'Carburant')}</label>
              <select id="oc-fuel" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                <option value="petrol">${tr('Petrol', 'Essence')}</option>
                <option value="diesel">Diesel</option>
                <option value="electric">${tr('Electric', 'Électrique')}</option>
                <option value="hybrid">${tr('Hybrid', 'Hybride')}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Country', 'Pays')}</label>
              <select id="oc-country" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                ${countryOpts}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                ${tr('Annual km', 'Km annuels')}
              </label>
              <select id="oc-km" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                <option value="8000">8 000 km</option>
                <option value="12000">12 000 km</option>
                <option value="15000" selected>15 000 km</option>
                <option value="20000">20 000 km</option>
                <option value="30000">30 000 km</option>
                <option value="40000">40 000 km</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                ${tr('Brand tier', 'Gamme')} <span class="font-normal text-zinc-400 normal-case">${tr('(affects maintenance)', '(affect l\'entretien)')}</span>
              </label>
              <select id="oc-tier" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                <option value="budget">${tr('Budget (Dacia, Skoda…)', 'Budget (Dacia, Skoda…)')}</option>
                <option value="mid" selected>${tr('Mid-range (VW, Toyota…)', 'Milieu de gamme (VW, Toyota…)')}</option>
                <option value="premium">${tr('Premium (BMW, Mercedes…)', 'Premium (BMW, Mercedes…)')}</option>
                <option value="luxury">${tr('Luxury / Sports', 'Luxe / Sport')}</option>
              </select>
            </div>

          </div>

          <button id="oc-calc" class="w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-700 transition text-sm">
            ${tr('Calculate ownership cost', 'Calculer le coût de possession')}
          </button>
        </div>

        <!-- Results -->
        <div id="oc-result" class="hidden"></div>

        <!-- Disclaimer -->
        <p class="text-center text-xs text-zinc-400 mt-6">
          ${tr('Estimates only. Actual costs vary by driver profile, insurer, and model.', 'Estimations uniquement. Les coûts réels varient selon le profil conducteur, l\'assureur et le modèle.')}
        </p>
      </div>
    </main>
  `

  attachLanguageToggle()
  document.getElementById('oc-calc')?.addEventListener('click', calculate)
}

function calculate() {
  const price    = parseFloat(document.getElementById('oc-price')?.value || '0')
  const year     = parseInt(document.getElementById('oc-year')?.value || '0', 10)
  const fuel     = document.getElementById('oc-fuel')?.value || 'petrol'
  const country  = document.getElementById('oc-country')?.value || 'FR'
  const annualKm = parseInt(document.getElementById('oc-km')?.value || '15000', 10)
  const tier     = document.getElementById('oc-tier')?.value || 'mid'

  if (!price || price < 500) {
    alert(tr('Please enter a valid purchase price.', 'Veuillez entrer un prix d\'achat valide.'))
    return
  }
  if (!year || year < 1998) {
    alert(tr('Please select a year.', 'Veuillez choisir une année.'))
    return
  }
  if (!country) {
    alert(tr('Please select a country.', 'Veuillez choisir un pays.'))
    return
  }

  // 1. Depreciation
  const deprPct   = getDepreciationPct(year)
  const deprAnnual = Math.round(price * deprPct / 100)

  // 2. Insurance
  const ins = INSURANCE_BY_COUNTRY[country] || INSURANCE_BY_COUNTRY['FR']
  const insAnnual = ins.avg

  // 3. Fuel
  const fuelData = FUEL_COST_PER_100KM[fuel] || FUEL_COST_PER_100KM['petrol']
  const fuelAnnual = Math.round((annualKm / 100) * fuelData.consumption * fuelData.price_eur_l)

  // 4. Maintenance
  const maintAnnual = MAINTENANCE_BY_BRAND_TIER[tier]?.annual || 900

  // 5. Total
  const totalAnnual = deprAnnual + insAnnual + fuelAnnual + maintAnnual
  const totalMonthly = Math.round(totalAnnual / 12)
  const totalPerKm   = (totalAnnual / annualKm).toFixed(2)

  renderResult({ price, year, fuel, country, annualKm, tier,
    deprAnnual, deprPct, insAnnual, ins, fuelAnnual, maintAnnual,
    totalAnnual, totalMonthly, totalPerKm })
}

function renderResult(d) {
  const el = document.getElementById('oc-result')
  if (!el) return
  el.classList.remove('hidden')

  const items = [
    {
      label: tr('Depreciation', 'Dépréciation'),
      sublabel: `−${d.deprPct}% ${tr('of purchase price/year', 'du prix d\'achat/an')}`,
      value: d.deprAnnual,
      icon: '📉',
      pct: Math.round(d.deprAnnual / d.totalAnnual * 100),
      tip: tr('Biggest cost. Newer cars depreciate faster — buying 2–4 year old cars avoids the steepest drop.',
              'Le plus grand coût. Les voitures récentes se déprécient vite — acheter 2–4 ans d\'âge évite la chute principale.')
    },
    {
      label: tr('Insurance', 'Assurance'),
      sublabel: tr('estimated avg comprehensive', 'estimation moy. tous risques'),
      value: d.insAnnual,
      icon: '🛡️',
      pct: Math.round(d.insAnnual / d.totalAnnual * 100),
      tip: `${tr('Range', 'Fourchette')}: ${fmtEUR(d.ins.min)} – ${fmtEUR(d.ins.max)}/an ${tr('in', 'en')} ${d.country}`
    },
    {
      label: tr('Fuel', 'Carburant'),
      sublabel: `${d.annualKm.toLocaleString()} km/an`,
      value: d.fuelAnnual,
      icon: '⛽',
      pct: Math.round(d.fuelAnnual / d.totalAnnual * 100),
      tip: tr('Based on average consumption and current pump prices.',
              'Basé sur la consommation moyenne et les prix actuels à la pompe.')
    },
    {
      label: tr('Maintenance', 'Entretien'),
      sublabel: tr('service, tyres, repairs', 'vidanges, pneus, réparations'),
      value: d.maintAnnual,
      icon: '🔧',
      pct: Math.round(d.maintAnnual / d.totalAnnual * 100),
      tip: tr('Includes regular servicing, tyre replacement, and unexpected repairs.',
              'Inclut entretien régulier, remplacement de pneus et réparations imprévues.')
    },
  ]

  const bars = items.map(item => `
    <div class="mb-4 last:mb-0">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2">
          <span class="text-base">${item.icon}</span>
          <div>
            <span class="text-sm font-semibold text-zinc-800">${item.label}</span>
            <span class="ml-2 text-xs text-zinc-400">${item.sublabel}</span>
          </div>
        </div>
        <span class="text-sm font-bold text-zinc-900">${fmtEUR(item.value)}/an</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div class="h-full bg-zinc-800 rounded-full transition-all duration-700" style="width:${item.pct}%"></div>
        </div>
        <span class="text-xs text-zinc-400 w-8 text-right">${item.pct}%</span>
      </div>
      <p class="text-xs text-zinc-400 mt-1">${item.tip}</p>
    </div>
  `).join('')

  el.innerHTML = `
    <!-- Total -->
    <div class="bg-zinc-900 rounded-2xl text-white p-6 mb-4">
      <p class="text-zinc-400 text-sm mb-1">${tr('Total annual cost of ownership', 'Coût annuel total de possession')}</p>
      <div class="flex items-baseline gap-4 flex-wrap">
        <span class="text-4xl font-extrabold">${fmtEUR(d.totalAnnual)}</span>
        <span class="text-zinc-400 text-base">${tr('per year', 'par an')}</span>
      </div>
      <div class="flex gap-6 mt-4 text-sm">
        <div>
          <p class="text-zinc-400 text-xs">${tr('Per month', 'Par mois')}</p>
          <p class="font-bold text-lg">${fmtEUR(d.totalMonthly)}</p>
        </div>
        <div>
          <p class="text-zinc-400 text-xs">${tr('Per km', 'Par km')}</p>
          <p class="font-bold text-lg">€${d.totalPerKm}</p>
        </div>
        <div>
          <p class="text-zinc-400 text-xs">${tr('5-year total', 'Coût 5 ans')}</p>
          <p class="font-bold text-lg">${fmtEUR(d.totalAnnual * 5 + d.price)}</p>
        </div>
      </div>
    </div>

    <!-- Breakdown -->
    <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-4">
      <h3 class="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-5">${tr('Cost breakdown', 'Détail des coûts')}</h3>
      ${bars}
    </div>

    <!-- Tips -->
    <div class="bg-blue-50 border border-blue-100 rounded-2xl p-5">
      <h4 class="text-sm font-semibold text-blue-800 mb-3">💡 ${tr('How to reduce your TCO', 'Comment réduire votre coût de possession')}</h4>
      <ul class="text-sm text-blue-700 space-y-1.5">
        <li>✓ ${tr('Buy 2–4 year old — skip the steepest depreciation curve', 'Achetez 2–4 ans — évitez la dépréciation la plus forte')}</li>
        <li>✓ ${tr('Diesel saves on fuel if you drive 20,000+ km/year', 'Le diesel économise sur le carburant si vous faites 20 000+ km/an')}</li>
        <li>✓ ${tr('Compare insurance quotes — range is wide (2-3×)', 'Comparez les devis assurance — la fourchette est large (2-3×)')}</li>
        <li>✓ ${tr('Budget brands cost 35–50% less in maintenance', 'Les marques budget coûtent 35–50% moins en entretien')}</li>
      </ul>
    </div>

    <!-- CTA -->
    <div class="mt-4 flex gap-3 flex-col sm:flex-row">
      <a href="#/deal-score" class="flex-1 py-2.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-700 transition text-sm text-center">
        ${tr('Check deal score for this model', 'Vérifier le deal score de ce modèle')} →
      </a>
      <a href="#/search" class="flex-1 py-2.5 border-2 border-zinc-900 text-zinc-900 font-semibold rounded-xl hover:bg-zinc-900 hover:text-white transition text-sm text-center">
        ${tr('Browse listings', 'Voir les annonces')} →
      </a>
    </div>
  `
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
