import { tr, getLang, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js'
import { isAuthenticated } from '../main.js'

const FREE_SEARCH_LIMIT = 5
const STORAGE_KEY_SEARCHES = 'carindex_ds_searches'
const STORAGE_KEY_EMAIL    = 'carindex_ds_email'

// ─── helpers ──────────────────────────────────────────────────────────────────

function getSearchCount() {
  return parseInt(localStorage.getItem(STORAGE_KEY_SEARCHES) || '0', 10)
}

function incrementSearchCount() {
  localStorage.setItem(STORAGE_KEY_SEARCHES, String(getSearchCount() + 1))
}

function hasSubmittedEmail() {
  return !!localStorage.getItem(STORAGE_KEY_EMAIL)
}

function isSearchAllowed() {
  if (isAuthenticated()) return true
  if (hasSubmittedEmail()) return true
  return getSearchCount() < FREE_SEARCH_LIMIT
}

function fmtEUR(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtNum(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR').format(n)
}

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany / Allemagne' },
  { code: 'BE', name: 'Belgium / Belgique' },
  { code: 'NL', name: 'Netherlands / Pays-Bas' },
  { code: 'SE', name: 'Sweden / Suède' },
  { code: 'IT', name: 'Italy / Italie' },
  { code: 'ES', name: 'Spain / Espagne' },
  { code: 'AT', name: 'Austria / Autriche' },
  { code: 'CH', name: 'Switzerland / Suisse' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'PL', name: 'Poland / Pologne' },
  { code: 'PT', name: 'Portugal' },
]

const CONFIDENCE_COLORS = {
  green:  { bg: 'bg-emerald-50',  text: 'text-emerald-700',  ring: 'ring-emerald-200' },
  yellow: { bg: 'bg-amber-50',    text: 'text-amber-700',    ring: 'ring-amber-200'   },
  red:    { bg: 'bg-red-50',      text: 'text-red-700',      ring: 'ring-red-200'     },
}

const DEAL_COLORS = {
  exceptional: { bg: 'bg-emerald-600', text: 'text-white',       bar: 'bg-emerald-500' },
  excellent:   { bg: 'bg-emerald-500', text: 'text-white',       bar: 'bg-emerald-400' },
  good:        { bg: 'bg-teal-500',    text: 'text-white',       bar: 'bg-teal-400'    },
  fair:        { bg: 'bg-zinc-200',    text: 'text-zinc-700',    bar: 'bg-zinc-300'    },
  high:        { bg: 'bg-amber-500',   text: 'text-white',       bar: 'bg-amber-400'   },
  overpriced:  { bg: 'bg-red-500',     text: 'text-white',       bar: 'bg-red-400'     },
}

// ─── render ───────────────────────────────────────────────────────────────────

export function renderDealScore() {
  const app = document.getElementById('app')

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i)
    .map(y => `<option value="${y}">${y}</option>`)
    .join('')

  const countryOptions = COUNTRIES
    .map(c => `<option value="${c.code}">${c.name}</option>`)
    .join('')

  app.innerHTML = `
    <!-- Nav -->
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
          <a href="#/search" class="text-sm text-zinc-500 hover:text-zinc-900 transition hidden sm:inline">${tr('Browse listings', 'Voir les annonces')}</a>
          ${isAuthenticated()
            ? `<a href="#/dashboard" class="text-sm text-zinc-500 hover:text-zinc-900 transition">${tr('Dashboard', 'Dashboard')}</a>`
            : `<a href="#/login" class="px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition">${tr('Sign in', 'Se connecter')}</a>`
          }
        </div>
      </nav>
    </header>

    <!-- Hero -->
    <main class="pt-[60px] min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <div class="max-w-2xl mx-auto px-4 py-12">

        <!-- Title -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-xs font-medium text-zinc-600 mb-4">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            ${tr('Based on real listings', 'Basé sur des annonces réelles')} · ${fmtNum(745000)}+ ${tr('cars indexed', 'voitures indexées')}
          </div>
          <h1 class="text-3xl sm:text-4xl font-bold text-zinc-900 mb-3 leading-tight">
            ${tr("What's this car really worth?", 'Ce véhicule est-il au bon prix\u00a0?')}
          </h1>
          <p class="text-zinc-500 text-base">
            ${tr('Instant market price from live listings across Europe. No signup required.', 'Prix du marché en temps réel. Sans inscription.')}
          </p>
        </div>

        <!-- Search card -->
        <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-6">
          <form id="ds-form" autocomplete="off">
            <div class="grid grid-cols-2 gap-4 mb-4">

              <!-- Brand -->
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Brand', 'Marque')}</label>
                <div class="relative">
                  <input id="ds-brand" type="text" placeholder="${tr('e.g. Volkswagen', 'ex. Volkswagen')}"
                    class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
                    autocomplete="off" list="ds-brand-list" />
                  <datalist id="ds-brand-list"></datalist>
                </div>
              </div>

              <!-- Model -->
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Model', 'Modèle')}</label>
                <div class="relative">
                  <input id="ds-model" type="text" placeholder="${tr('e.g. Golf', 'ex. Golf')}"
                    class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
                    autocomplete="off" list="ds-model-list" />
                  <datalist id="ds-model-list"></datalist>
                </div>
              </div>

              <!-- Year -->
              <div>
                <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Year', 'Année')}</label>
                <select id="ds-year" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white transition">
                  <option value="">${tr('Select year', 'Choisir l\'année')}</option>
                  ${yearOptions}
                </select>
              </div>

              <!-- Mileage -->
              <div>
                <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  ${tr('Mileage (km)', 'Kilométrage (km)')}
                  <span class="font-normal text-zinc-400 normal-case">${tr('optional', 'optionnel')}</span>
                </label>
                <input id="ds-mileage" type="number" min="0" max="999999" step="1000"
                  placeholder="${tr('e.g. 85000', 'ex. 85000')}"
                  class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition" />
              </div>

              <!-- Country -->
              <div>
                <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Country', 'Pays')}</label>
                <select id="ds-country" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white transition">
                  <option value="">${tr('All countries', 'Tous les pays')}</option>
                  ${countryOptions}
                </select>
              </div>

              <!-- Your price -->
              <div>
                <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  ${tr('Asking price (€)', 'Prix demandé (€)')}
                  <span class="font-normal text-zinc-400 normal-case">${tr('optional', 'optionnel')}</span>
                </label>
                <input id="ds-price" type="number" min="100" step="100"
                  placeholder="${tr('e.g. 18500', 'ex. 18500')}"
                  class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition" />
              </div>

            </div>

            <!-- Fuel / Transmission (optional, collapsed row) -->
            <div class="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  ${tr('Fuel type', 'Carburant')}
                  <span class="font-normal text-zinc-400 normal-case">${tr('optional', 'optionnel')}</span>
                </label>
                <select id="ds-fuel" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white transition">
                  <option value="">${tr('Any', 'Tous')}</option>
                  <option value="diesel">${tr('Diesel', 'Diesel')}</option>
                  <option value="petrol">${tr('Petrol', 'Essence')}</option>
                  <option value="electric">${tr('Electric', 'Électrique')}</option>
                  <option value="hybrid">${tr('Hybrid', 'Hybride')}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  ${tr('Transmission', 'Transmission')}
                  <span class="font-normal text-zinc-400 normal-case">${tr('optional', 'optionnel')}</span>
                </label>
                <select id="ds-transmission" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white transition">
                  <option value="">${tr('Any', 'Toutes')}</option>
                  <option value="manual">${tr('Manual', 'Manuelle')}</option>
                  <option value="automatic">${tr('Automatic', 'Automatique')}</option>
                </select>
              </div>
            </div>

            <!-- Search limit info -->
            <div id="ds-limit-notice" class="hidden mb-4 px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-500">
              ${tr('Free searches remaining', 'Recherches gratuites restantes')}: <span id="ds-remaining" class="font-semibold text-zinc-700"></span>
            </div>

            <button type="submit" id="ds-submit"
              class="w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-700 active:scale-[0.98] transition text-sm">
              ${tr('Get market price', 'Obtenir le prix du marché')}
            </button>
          </form>
        </div>

        <!-- Result area -->
        <div id="ds-result" class="hidden"></div>

        <!-- How it works -->
        <div class="mt-10 text-center">
          <p class="text-xs text-zinc-400 mb-3 uppercase tracking-wide font-medium">${tr('How it works', 'Comment ça marche')}</p>
          <div class="flex flex-col sm:flex-row gap-4 text-sm text-zinc-500">
            <div class="flex-1 flex items-start gap-2">
              <span class="text-base mt-0.5">🔍</span>
              <span>${tr('We scan live listings across 15+ European platforms every day.', 'Nous scannons les annonces en direct sur 15+ plateformes européennes.')}</span>
            </div>
            <div class="flex-1 flex items-start gap-2">
              <span class="text-base mt-0.5">📊</span>
              <span>${tr('Median price is calculated from comparable cars — same model, similar year and mileage.', 'Le prix médian est calculé sur des voitures comparables — même modèle, année et kilométrage similaires.')}</span>
            </div>
            <div class="flex-1 flex items-start gap-2">
              <span class="text-base mt-0.5">✅</span>
              <span>${tr('Deal labels are based on how the listing price compares to market.', 'Les étiquettes de deal se basent sur l\'écart entre le prix et le marché.')}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Email capture modal -->
    <div id="ds-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/50" id="ds-modal-backdrop"></div>
      <div class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
        <div class="text-4xl mb-3">📬</div>
        <h2 class="text-xl font-bold text-zinc-900 mb-2">
          ${tr('Unlock unlimited searches', 'Débloquer des recherches illimitées')}
        </h2>
        <p class="text-zinc-500 text-sm mb-6">
          ${tr("You've used your 5 free searches. Enter your email to continue — it's free.", "Vous avez utilisé vos 5 recherches gratuites. Entrez votre email pour continuer — c'est gratuit.")}
        </p>
        <input id="ds-email" type="email" placeholder="${tr('your@email.com', 'votre@email.com')}"
          class="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-zinc-900" />
        <p id="ds-email-error" class="hidden text-xs text-red-500 mb-2"></p>
        <button id="ds-email-submit" class="w-full py-2.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-700 transition text-sm">
          ${tr('Continue for free', 'Continuer gratuitement')}
        </button>
        <p class="text-xs text-zinc-400 mt-3">
          ${tr('No spam. You can unsubscribe anytime.', 'Pas de spam. Désinscription à tout moment.')}
        </p>
      </div>
    </div>
  `

  attachLanguageToggle()
  loadBrandSuggestions()
  attachFormHandlers()
  updateLimitNotice()
}

// ─── brand / model autocomplete ───────────────────────────────────────────────

async function loadBrandSuggestions() {
  try {
    const res = await fetch('/api/v1/facets?field=brand')
    if (!res.ok) return
    const data = await res.json()
    const brands = data.brands || data || []
    const list = document.getElementById('ds-brand-list')
    if (!list) return
    list.innerHTML = brands.slice(0, 100).map(b => `<option value="${b}"></option>`).join('')
  } catch (_) { /* ignore */ }
}

async function loadModelSuggestions(brand) {
  if (!brand) return
  try {
    const res = await fetch(`/api/v1/facets?field=model&brand=${encodeURIComponent(brand)}`)
    if (!res.ok) return
    const data = await res.json()
    const models = data.models || data || []
    const list = document.getElementById('ds-model-list')
    if (!list) return
    list.innerHTML = models.slice(0, 100).map(m => `<option value="${m}"></option>`).join('')
  } catch (_) { /* ignore */ }
}

// ─── limit notice ─────────────────────────────────────────────────────────────

function updateLimitNotice() {
  if (isAuthenticated() || hasSubmittedEmail()) return
  const count = getSearchCount()
  const remaining = Math.max(0, FREE_SEARCH_LIMIT - count)
  const notice = document.getElementById('ds-limit-notice')
  const remainingEl = document.getElementById('ds-remaining')
  if (!notice || !remainingEl) return
  if (count > 0) {
    notice.classList.remove('hidden')
    remainingEl.textContent = remaining
  }
}

// ─── form handlers ────────────────────────────────────────────────────────────

function attachFormHandlers() {
  const form = document.getElementById('ds-form')
  const brandInput = document.getElementById('ds-brand')

  brandInput?.addEventListener('change', () => loadModelSuggestions(brandInput.value))
  brandInput?.addEventListener('blur', () => loadModelSuggestions(brandInput.value))

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()

    const brand = document.getElementById('ds-brand')?.value?.trim()
    const model = document.getElementById('ds-model')?.value?.trim()
    const year  = document.getElementById('ds-year')?.value
    const mileage      = document.getElementById('ds-mileage')?.value?.trim()
    const country      = document.getElementById('ds-country')?.value
    const price        = document.getElementById('ds-price')?.value?.trim()
    const fuel_type    = document.getElementById('ds-fuel')?.value
    const transmission = document.getElementById('ds-transmission')?.value

    // Validate
    if (!brand || !model || !year) {
      showFormError(tr('Please fill in brand, model and year.', 'Veuillez renseigner la marque, le modèle et l\'année.'))
      return
    }

    // Check search limit
    if (!isSearchAllowed()) {
      showModal()
      return
    }

    // Run search
    await runDealScore({ brand, model, year, mileage, country, price, fuel_type, transmission })
  })

  // Modal handlers
  document.getElementById('ds-modal-backdrop')?.addEventListener('click', hideModal)
  document.getElementById('ds-email-submit')?.addEventListener('click', handleEmailSubmit)
}

function showFormError(msg) {
  const resultEl = document.getElementById('ds-result')
  if (!resultEl) return
  resultEl.classList.remove('hidden')
  resultEl.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">${msg}</div>`
}

// ─── search execution ─────────────────────────────────────────────────────────

async function runDealScore({ brand, model, year, mileage, country, price, fuel_type, transmission }) {
  const resultEl = document.getElementById('ds-result')
  const submitBtn = document.getElementById('ds-submit')

  // Loading state
  resultEl.classList.remove('hidden')
  resultEl.innerHTML = `
    <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 flex flex-col items-center gap-3 text-zinc-500">
      <svg class="w-8 h-8 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <span class="text-sm">${tr('Analysing market data…', 'Analyse des données du marché…')}</span>
    </div>
  `
  if (submitBtn) submitBtn.disabled = true

  try {
    const params = new URLSearchParams({ brand, model, year })
    if (mileage)      params.set('mileage', mileage)
    if (country)      params.set('country', country)
    if (price)        params.set('price', price)
    if (fuel_type)    params.set('fuel_type', fuel_type)
    if (transmission) params.set('transmission', transmission)

    const res = await fetch(`/api/v1/deal-score?${params}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const data = await res.json()

    // Count this as a search
    incrementSearchCount()
    updateLimitNotice()

    renderResult(data, { brand, model, year, mileage, country, price })
  } catch (err) {
    resultEl.innerHTML = `
      <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
        <strong>${tr('Error:', 'Erreur\u00a0:')}</strong> ${err.message}
      </div>
    `
  } finally {
    if (submitBtn) submitBtn.disabled = false
  }
}

// ─── result rendering ─────────────────────────────────────────────────────────

function renderResult(data, params) {
  const resultEl = document.getElementById('ds-result')
  if (!resultEl) return

  const hasMarket = data.market_price != null && data.market_price > 0
  const hasDeal   = data.deal_score != null
  const ds        = data.deal_score || {}
  const dc        = DEAL_COLORS[ds.badge] || DEAL_COLORS.fair
  const cc        = CONFIDENCE_COLORS[data.confidence_label?.color] || CONFIDENCE_COLORS.yellow

  // Build search link
  const searchParams = new URLSearchParams()
  if (params.brand)   searchParams.set('brand', params.brand)
  if (params.model)   searchParams.set('model', params.model)
  if (params.year)    { searchParams.set('min_year', params.year); searchParams.set('max_year', params.year) }
  if (params.country) searchParams.set('country', params.country)
  const searchLink = `/search?${searchParams}`

  if (!hasMarket) {
    resultEl.innerHTML = `
      <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
        <div class="text-4xl mb-3">🔍</div>
        <h3 class="text-lg font-semibold text-zinc-800 mb-2">
          ${tr('Not enough data', 'Données insuffisantes')}
        </h3>
        <p class="text-zinc-500 text-sm mb-6">
          ${tr('We don\'t have enough comparable listings for this vehicle. Try broadening the search — remove country or mileage filters.', 'Nous n\'avons pas assez d\'annonces comparables pour ce véhicule. Essayez d\'élargir la recherche.')}
        </p>
        <a href="${searchLink}" class="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-700 transition">
          ${tr('Browse available listings', 'Voir les annonces disponibles')}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    `
    return
  }

  resultEl.innerHTML = `
    <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">

      <!-- Header bar -->
      <div class="px-6 pt-6 pb-4 border-b border-zinc-100">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              ${tr('Market analysis', 'Analyse de marché')}
            </p>
            <h2 class="text-xl font-bold text-zinc-900">
              ${data.brand} ${data.model} · ${data.year}
              ${params.country ? `<span class="ml-1 text-sm font-normal text-zinc-400">(${params.country})</span>` : ''}
            </h2>
          </div>
          ${hasDeal ? `
            <div class="shrink-0 px-4 py-2 ${dc.bg} ${dc.text} rounded-xl font-bold text-sm whitespace-nowrap">
              ${ds.label}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Main metrics -->
      <div class="px-6 py-5">

        <!-- Market price -->
        <div class="mb-6">
          <p class="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">
            ${tr('Market price', 'Prix du marché')}
          </p>
          <div class="flex items-baseline gap-3 flex-wrap">
            <span class="text-4xl font-extrabold text-zinc-900">${fmtEUR(data.market_price)}</span>
            ${hasDeal ? `
              <span class="text-lg font-semibold ${ds.vs_market_pct <= 0 ? 'text-emerald-600' : 'text-red-500'}">
                ${ds.vs_market_pct > 0 ? '+' : ''}${ds.vs_market_pct}%
              </span>
            ` : ''}
          </div>
          ${hasDeal && ds.savings > 0 ? `
            <p class="text-sm text-emerald-600 mt-1 font-medium">
              💰 ${tr('Saves you', 'Économie de')} ${fmtEUR(ds.savings)} ${tr('vs market', 'par rapport au marché')}
            </p>
          ` : ''}
          ${hasDeal && ds.savings < 0 ? `
            <p class="text-sm text-red-500 mt-1 font-medium">
              ⚠️ ${fmtEUR(Math.abs(ds.savings))} ${tr('above market price', 'au-dessus du prix du marché')}
            </p>
          ` : ''}
        </div>

        <!-- Price range bar -->
        ${data.price_range?.min && data.price_range?.max ? `
          <div class="mb-6">
            <div class="flex justify-between text-xs text-zinc-400 mb-1.5">
              <span>${tr('Low', 'Bas')} ${fmtEUR(data.price_range.min)}</span>
              <span>${tr('Market', 'Marché')} ${fmtEUR(data.market_price)}</span>
              <span>${tr('High', 'Haut')} ${fmtEUR(data.price_range.max)}</span>
            </div>
            <div class="relative h-2 rounded-full bg-zinc-100">
              <!-- Range bar -->
              ${(() => {
                const min = data.price_range.min
                const max = data.price_range.max
                const span = max - min || 1
                const medPct  = ((data.market_price - min) / span * 100).toFixed(1)
                const pricePct = hasDeal ? ((ds.listing_price - min) / span * 100).toFixed(1) : null
                return `
                  <!-- median marker -->
                  <div class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-zinc-700 border-2 border-white shadow" style="left:calc(${medPct}% - 6px)"></div>
                  ${pricePct != null ? `
                    <div class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${ds.vs_market_pct <= 0 ? 'bg-emerald-500' : 'bg-red-500'} border-2 border-white shadow" style="left:calc(${Math.min(98, Math.max(2, pricePct))}% - 6px)"></div>
                  ` : ''}
                `
              })()}
            </div>
            ${hasDeal ? `
              <div class="flex gap-4 mt-2 text-xs text-zinc-400">
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-full bg-zinc-700"></span>${tr('Market median', 'Médiane marché')}</span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-full ${ds.vs_market_pct <= 0 ? 'bg-emerald-500' : 'bg-red-500'}"></span>${tr('This listing', 'Cette annonce')} (${fmtEUR(ds.listing_price)})</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Stats row -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-zinc-50 rounded-xl p-3 text-center">
            <div class="text-lg font-bold text-zinc-900">${fmtNum(data.comparables_count)}</div>
            <div class="text-xs text-zinc-400 mt-0.5">${tr('comparables', 'comparables')}</div>
          </div>
          <div class="bg-zinc-50 rounded-xl p-3 text-center">
            <div class="text-lg font-bold text-zinc-900">${fmtEUR(data.price_range?.median || data.market_price)}</div>
            <div class="text-xs text-zinc-400 mt-0.5">${tr('median', 'médiane')}</div>
          </div>
          <div class="rounded-xl p-3 text-center ring-1 ring-inset ${cc.bg} ${cc.ring}">
            <div class="text-lg font-bold ${cc.text}">${data.confidence_index}</div>
            <div class="text-xs ${cc.text} opacity-80 mt-0.5">${tr('confidence', 'confiance')}/100</div>
          </div>
        </div>

        <!-- Confidence explanation -->
        <p class="text-xs text-zinc-400 mb-5">
          ${tr('Confidence score is based on number of comparable listings, price variance, and data freshness.', 'Le score de confiance est basé sur le nombre d\'annonces comparables, la variance des prix et la fraîcheur des données.')}
          ${data.comparables_count < 10 ? `<span class="text-amber-500">&nbsp;${tr('Low sample — treat estimate with caution.', 'Échantillon faible — utilisez cette estimation avec prudence.')}</span>` : ''}
        </p>

        <!-- CTA -->
        <a href="${searchLink}"
          class="flex items-center justify-center gap-2 w-full py-3 border-2 border-zinc-900 text-zinc-900 font-semibold rounded-xl hover:bg-zinc-900 hover:text-white transition text-sm">
          ${tr('Browse', 'Voir')} ${data.brand} ${data.model} ${data.year} ${tr('listings', 'annonces')}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
        <span class="text-xs text-zinc-400">
          ${tr('Updated', 'Mis à jour')} ${new Date(data.last_updated || Date.now()).toLocaleDateString()}
        </span>
        <button onclick="window.shareDealScore()" class="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
          ${tr('Share', 'Partager')}
        </button>
      </div>
    </div>

    <!-- Sign up CTA (for unauthenticated users) -->
    ${!isAuthenticated() ? `
      <div class="mt-4 p-4 bg-zinc-900 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <p class="font-semibold text-sm">${tr('Want price alerts and saved searches?', 'Alertes de prix et recherches sauvegardées ?')}</p>
          <p class="text-zinc-400 text-xs mt-0.5">${tr('Create a free account.', 'Créez un compte gratuit.')}</p>
        </div>
        <a href="#/signup" class="shrink-0 px-4 py-2 bg-white text-zinc-900 font-semibold text-sm rounded-xl hover:bg-zinc-100 transition">
          ${tr('Sign up free', 'S\'inscrire gratuitement')}
        </a>
      </div>
    ` : ''}
  `

  // Scroll to result
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// ─── modal ────────────────────────────────────────────────────────────────────

function showModal() {
  document.getElementById('ds-modal')?.classList.remove('hidden')
  document.getElementById('ds-email')?.focus()
}

function hideModal() {
  document.getElementById('ds-modal')?.classList.add('hidden')
}

async function handleEmailSubmit() {
  const emailInput = document.getElementById('ds-email')
  const errorEl    = document.getElementById('ds-email-error')
  const email      = emailInput?.value?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errorEl) {
      errorEl.textContent = tr('Please enter a valid email.', 'Veuillez entrer un email valide.')
      errorEl.classList.remove('hidden')
    }
    return
  }

  if (errorEl) errorEl.classList.add('hidden')

  // Store email locally — in production send to backend
  localStorage.setItem(STORAGE_KEY_EMAIL, email)
  // Reset search counter
  localStorage.setItem(STORAGE_KEY_SEARCHES, '0')

  // Optional: send email to backend for newsletter/leads
  try {
    await fetch('/api/v1/auth/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'deal-score' }),
    })
  } catch (_) { /* non-blocking */ }

  hideModal()

  // Re-trigger the search
  document.getElementById('ds-form')?.dispatchEvent(new Event('submit'))
}

// ─── share ────────────────────────────────────────────────────────────────────

window.shareDealScore = function () {
  const url = window.location.href
  if (navigator.share) {
    navigator.share({ title: 'Carindex Deal Score', url }).catch(() => {})
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      alert(tr('Link copied!', 'Lien copié !'))
    })
  }
}
