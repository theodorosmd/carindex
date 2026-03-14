import { tr, getLang, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js'
import { isAuthenticated } from '../main.js'

// ─── country data ─────────────────────────────────────────────────────────────

const COUNTRY_NAMES = {
  FR: 'France', DE: 'Germany', BE: 'Belgium', NL: 'Netherlands',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
  IT: 'Italy', ES: 'Spain', PL: 'Poland', CH: 'Switzerland',
  AT: 'Austria', PT: 'Portugal', LU: 'Luxembourg',
}

const COUNTRY_FLAGS = {
  FR: '🇫🇷', DE: '🇩🇪', BE: '🇧🇪', NL: '🇳🇱', SE: '🇸🇪', NO: '🇳🇴',
  DK: '🇩🇰', FI: '🇫🇮', IT: '🇮🇹', ES: '🇪🇸', PL: '🇵🇱', CH: '🇨🇭',
  AT: '🇦🇹', PT: '🇵🇹', LU: '🇱🇺',
}

function countryOpts(selected = '') {
  return Object.entries(COUNTRY_NAMES)
    .map(([c, n]) => `<option value="${c}" ${c === selected ? 'selected' : ''}>${COUNTRY_FLAGS[c] || ''} ${n}</option>`)
    .join('')
}

function fmtEUR(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat(getLang() === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n)
}

function fmtPct(n) {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + n + '%'
}

// ─── render page ──────────────────────────────────────────────────────────────

export function renderImportArbitrage() {
  const app = document.getElementById('app')
  const detectedLang = getLang()

  // Default sell country based on browser language
  const defaultSell = detectedLang === 'fr' ? 'FR' : detectedLang === 'de' ? 'DE' : 'FR'
  const currentYear = new Date().getFullYear()
  const yearOpts = Array.from({ length: 20 }, (_, i) => currentYear - i)
    .map(y => `<option value="${y}" ${y === currentYear - 3 ? 'selected' : ''}>${y}</option>`)
    .join('')

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
          <a href="#/ownership-cost" class="text-sm text-zinc-500 hover:text-zinc-900 transition hidden sm:inline">${tr('TCO', 'Coût possession')}</a>
          <a href="#/search" class="text-sm text-zinc-500 hover:text-zinc-900 transition hidden sm:inline">${tr('Search', 'Rechercher')}</a>
          ${isAuthenticated()
            ? `<a href="#/arbitrage" class="text-sm text-zinc-500 hover:text-zinc-900 transition hidden sm:inline">${tr('Pro Arbitrage', 'Arbitrage Pro')}</a>
               <a href="#/dashboard" class="text-sm px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition">${tr('Dashboard', 'Dashboard')}</a>`
            : `<a href="#/signup" class="text-sm px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition">${tr('Sign up free', 'S\'inscrire')}</a>`
          }
        </div>
      </nav>
    </header>

    <main class="pt-[60px] min-h-screen bg-zinc-50">
      <div class="max-w-4xl mx-auto px-4 py-10">

        <!-- Hero -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-xs font-medium text-zinc-600 mb-4">
            🌍 ${tr('Cross-country price comparison', 'Comparaison de prix cross-pays')}
          </div>
          <h1 class="text-3xl sm:text-4xl font-bold text-zinc-900 mb-3">
            ${tr('Where to buy this car for the best price?', 'Où acheter cette voiture au meilleur prix\u00a0?')}
          </h1>
          <p class="text-zinc-500 text-base max-w-xl mx-auto">
            ${tr('Compare market prices across Europe, calculate import costs, and see your net margin.', 'Comparez les prix de marché en Europe, calculez les coûts d\'import et voyez votre marge nette.')}
          </p>
        </div>

        <!-- Form card -->
        <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-6">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">

            <div class="col-span-2 sm:col-span-1">
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Brand', 'Marque')}</label>
              <input id="ia-brand" type="text" placeholder="e.g. volkswagen"
                class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>

            <div class="col-span-2 sm:col-span-1">
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Model', 'Modèle')}</label>
              <input id="ia-model" type="text" placeholder="e.g. golf"
                class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">${tr('Year', 'Année')}</label>
              <select id="ia-year" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                ${yearOpts}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                ${tr('I want to sell in', 'Je veux vendre en')}
              </label>
              <select id="ia-sell" class="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                ${countryOpts(defaultSell)}
              </select>
            </div>

          </div>

          <button id="ia-search" class="w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-700 transition text-sm">
            ${tr('Compare across countries', 'Comparer entre pays')} →
          </button>
        </div>

        <!-- Results -->
        <div id="ia-result" class="hidden"></div>

        <!-- Info banner -->
        <div class="bg-blue-50 border border-blue-100 rounded-2xl p-5 mt-4">
          <h4 class="text-sm font-semibold text-blue-800 mb-2">ℹ️ ${tr('How it works', 'Comment ça marche')}</h4>
          <ul class="text-sm text-blue-700 space-y-1">
            <li>• ${tr('Market prices are median prices from real active listings in our database.', 'Les prix de marché sont les médianes des annonces actives dans notre base.')}</li>
            <li>• ${tr('Import costs include transport, registration, and reconditioning estimates.', 'Les coûts d\'import incluent transport, immatriculation et remise en état.')}</li>
            <li>• ${tr('Net margin = sell country median price − (buy price + import costs).', 'Marge nette = prix médian pays de vente − (prix d\'achat + coûts d\'import).')}</li>
          </ul>
        </div>

      </div>
    </main>
  `

  attachLanguageToggle()
  document.getElementById('ia-search')?.addEventListener('click', runComparison)

  // Submit on Enter in text fields
  ;['ia-brand', 'ia-model'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') runComparison()
    })
  })
}

// ─── comparison logic ─────────────────────────────────────────────────────────

async function runComparison() {
  const brand     = document.getElementById('ia-brand')?.value?.trim()
  const model     = document.getElementById('ia-model')?.value?.trim()
  const year      = document.getElementById('ia-year')?.value
  const sellCnt   = document.getElementById('ia-sell')?.value
  const resultEl  = document.getElementById('ia-result')
  const btn       = document.getElementById('ia-search')

  if (!brand || !model) {
    showError(tr('Please enter a brand and model.', 'Veuillez saisir une marque et un modèle.'))
    return
  }

  if (resultEl) resultEl.classList.remove('hidden')
  if (resultEl) resultEl.innerHTML = renderSkeleton()
  if (btn) { btn.disabled = true; btn.textContent = tr('Loading…', 'Chargement…') }

  try {
    const params = new URLSearchParams({ brand, model, year })
    if (sellCnt) params.set('sell_country', sellCnt)

    const res = await fetch(`/api/v1/deal-score/compare?${params.toString()}`)

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}))
      showError(tr('Rate limit reached. Sign in for unlimited comparisons.', 'Limite atteinte. Connectez-vous pour des comparaisons illimitées.'), true)
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showError(data.error || tr('Server error. Try again.', 'Erreur serveur. Réessayez.'))
      return
    }

    const data = await res.json()
    renderResult(data, sellCnt)
  } catch (e) {
    showError(tr('Connection error. Try again.', 'Erreur de connexion. Réessayez.'))
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = tr('Compare across countries', 'Comparer entre pays') + ' →' }
  }
}

function showError(msg, withSignup = false) {
  const resultEl = document.getElementById('ia-result')
  if (!resultEl) return
  resultEl.classList.remove('hidden')
  resultEl.innerHTML = `
    <div class="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">
      ${msg}
      ${withSignup ? `<a href="#/signup" class="ml-2 font-semibold underline">${tr('Sign up free →', 'Inscription gratuite →')}</a>` : ''}
    </div>`
}

function renderSkeleton() {
  return `
    <div class="animate-pulse space-y-3">
      ${Array.from({ length: 6 }, () => `
        <div class="bg-white rounded-xl border border-zinc-100 h-16 flex items-center px-5 gap-4">
          <div class="w-24 h-4 bg-zinc-200 rounded"></div>
          <div class="flex-1 h-4 bg-zinc-100 rounded"></div>
          <div class="w-20 h-4 bg-zinc-200 rounded"></div>
        </div>`).join('')}
    </div>`
}

function renderResult(data, sellCnt) {
  const resultEl = document.getElementById('ia-result')
  if (!resultEl) return

  const { brand, model, year, sell_country, sell_median_price, countries = [], total_listings } = data

  if (countries.length === 0) {
    resultEl.innerHTML = `
      <div class="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500">
        <p class="text-lg font-medium mb-2">${tr('No data found', 'Aucune donnée trouvée')}</p>
        <p class="text-sm">${tr('Try a more common model or a wider year range.', 'Essayez un modèle plus courant ou une plage d\'années plus large.')}</p>
      </div>`
    return
  }

  const sellName = COUNTRY_NAMES[sell_country] || sell_country || '—'
  const totalListings = total_listings || 0

  // Separate rows that have net_margin from those that don't
  const withMargin    = countries.filter(c => c.net_margin != null)
  const withoutMargin = countries.filter(c => c.net_margin == null)

  // Best deal
  const best = withMargin[0]
  const bestBadge = best && best.net_margin > 0
    ? `<div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
        <div class="text-2xl">🏆</div>
        <div>
          <p class="text-sm font-bold text-emerald-800">
            ${tr('Best opportunity:', 'Meilleure opportunité\u00a0:')}
            ${COUNTRY_FLAGS[best.country] || ''} ${COUNTRY_NAMES[best.country] || best.country}
          </p>
          <p class="text-xs text-emerald-700 mt-0.5">
            ${tr('Buy at', 'Acheter à')} ${fmtEUR(best.median_price)} · ${tr('import costs', 'coûts import')} ~${fmtEUR(best.import_costs)} ·
            ${tr('net margin', 'marge nette')} <span class="font-bold">${fmtEUR(best.net_margin)}</span> (${fmtPct(best.net_margin_pct)})
          </p>
        </div>
      </div>`
    : ''

  const headerTitle = `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
      <div>
        <h2 class="text-lg font-bold text-zinc-900 capitalize">
          ${brand} ${model} ${year}
        </h2>
        <p class="text-xs text-zinc-400 mt-0.5">
          ${totalListings} ${tr('listings analysed', 'annonces analysées')} ·
          ${tr('selling in', 'vente en')} ${COUNTRY_FLAGS[sell_country] || ''} ${sellName}
          ${sell_median_price ? ` · ${tr('sell market price', 'prix marché vente')} ${fmtEUR(sell_median_price)}` : ''}
        </p>
      </div>
      ${isAuthenticated()
        ? `<a href="#/arbitrage" class="text-xs px-3 py-1.5 border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50 transition">
             ${tr('Pro arbitrage tools →', 'Outils arbitrage pro →')}
           </a>`
        : `<a href="#/signup" class="text-xs px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition">
             ${tr('Unlock pro tools →', 'Débloquer les outils pro →')}
           </a>`
      }
    </div>`

  // Main comparison table
  function rowHtml(c, isSellCountry = false) {
    const hasMargin = c.net_margin != null
    const marginColor = !hasMargin
      ? 'text-zinc-400'
      : c.net_margin >= 2000
        ? 'text-emerald-600'
        : c.net_margin >= 0
          ? 'text-teal-600'
          : 'text-red-500'

    const rowBg = isSellCountry
      ? 'bg-zinc-50'
      : hasMargin && c.net_margin >= 2000
        ? 'bg-emerald-50/40'
        : ''

    const badge = isSellCountry
      ? `<span class="ml-2 text-xs px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-full">${tr('your market', 'votre marché')}</span>`
      : hasMargin && c.net_margin >= 2000
        ? `<span class="ml-2 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">✓ ${tr('Opportunity', 'Opportunité')}</span>`
        : ''

    // Build search link for this country
    const searchParams = new URLSearchParams()
    const brand = document.getElementById('ia-brand')?.value?.trim() || ''
    const model = document.getElementById('ia-model')?.value?.trim() || ''
    const year  = document.getElementById('ia-year')?.value || ''
    searchParams.set('brand', brand)
    searchParams.set('model', model)
    searchParams.set('country', c.country)
    if (year) { searchParams.set('min_year', String(parseInt(year) - 1)); searchParams.set('max_year', String(parseInt(year) + 1)) }
    const searchHref = `/search?${searchParams.toString()}`

    const confidenceDot = c.confidence >= 70
      ? `<span class="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1" title="High confidence"></span>`
      : c.confidence >= 40
        ? `<span class="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1" title="Medium confidence"></span>`
        : `<span class="w-2 h-2 rounded-full bg-zinc-300 inline-block mr-1" title="Low confidence"></span>`

    return `
      <div class="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition ${rowBg}">
        <!-- Country -->
        <div class="w-36 sm:w-44 shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="text-base">${COUNTRY_FLAGS[c.country] || '🏳️'}</span>
            <span class="text-sm font-semibold text-zinc-800">${COUNTRY_NAMES[c.country] || c.country}</span>
            ${badge}
          </div>
          <div class="flex items-center mt-0.5">
            ${confidenceDot}
            <span class="text-xs text-zinc-400">${c.count} ${tr('listings', 'annonces')}</span>
          </div>
        </div>

        <!-- Market price -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-zinc-900">${fmtEUR(c.median_price)}</p>
          <p class="text-xs text-zinc-400">${tr('market median', 'médiane marché')}</p>
        </div>

        <!-- Import costs -->
        <div class="hidden sm:block w-28 text-right">
          ${isSellCountry
            ? `<p class="text-sm text-zinc-400">—</p><p class="text-xs text-zinc-400">${tr('your country', 'votre pays')}</p>`
            : c.import_costs != null
              ? `<p class="text-sm font-medium text-zinc-600">~${fmtEUR(c.import_costs)}</p><p class="text-xs text-zinc-400">${tr('import costs', 'coûts import')}</p>`
              : `<p class="text-sm text-zinc-400">—</p><p class="text-xs text-zinc-400">${tr('no data', 'pas de données')}</p>`
          }
        </div>

        <!-- Net margin -->
        <div class="w-28 sm:w-32 text-right">
          ${isSellCountry
            ? `<p class="text-sm text-zinc-400">—</p><p class="text-xs text-zinc-400">${tr('home market', 'marché local')}</p>`
            : hasMargin
              ? `<p class="text-sm font-bold ${marginColor}">${fmtEUR(c.net_margin)}</p><p class="text-xs ${marginColor}">${fmtPct(c.net_margin_pct)}</p>`
              : `<p class="text-sm text-zinc-400">—</p><p class="text-xs text-zinc-400">${tr('no sell price', 'pas de prix vente')}</p>`
          }
        </div>

        <!-- CTA -->
        <div class="w-16 text-right shrink-0">
          <a href="${searchHref}" class="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">
            ${tr('Listings', 'Annonces')} →
          </a>
        </div>
      </div>`
  }

  // Build sell country row (always first)
  const sellRow = sell_country
    ? (countries.find(c => c.country === sell_country)
        ? rowHtml(countries.find(c => c.country === sell_country), true)
        : '')
    : ''

  const buyRows = withMargin
    .filter(c => c.country !== sell_country)
    .map(c => rowHtml(c))
    .join('')

  const otherRows = withoutMargin
    .filter(c => c.country !== sell_country)
    .map(c => rowHtml(c))
    .join('')

  // Import cost breakdown tooltip (for the best opportunity)
  let breakdownHtml = ''
  if (best && best.import_breakdown) {
    const b = best.import_breakdown
    breakdownHtml = `
      <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 mt-4">
        <h3 class="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
          📦 ${tr('Import cost breakdown', 'Détail des coûts d\'import')} —
          ${COUNTRY_FLAGS[best.country] || ''} ${COUNTRY_NAMES[best.country]} → ${COUNTRY_FLAGS[sell_country] || ''} ${sellName}
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div class="p-3 bg-zinc-50 rounded-xl">
            <p class="text-lg font-bold text-zinc-900">${fmtEUR(b.transport)}</p>
            <p class="text-xs text-zinc-500 mt-1">🚛 ${tr('Transport', 'Transport')}</p>
          </div>
          <div class="p-3 bg-zinc-50 rounded-xl">
            <p class="text-lg font-bold text-zinc-900">${fmtEUR(b.registration)}</p>
            <p class="text-xs text-zinc-500 mt-1">📋 ${tr('Registration', 'Immatriculation')}</p>
          </div>
          <div class="p-3 bg-zinc-50 rounded-xl">
            <p class="text-lg font-bold text-zinc-900">${fmtEUR(b.reconditioning)}</p>
            <p class="text-xs text-zinc-500 mt-1">🔧 ${tr('Reconditioning', 'Remise en état')}</p>
          </div>
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <p class="text-lg font-bold text-emerald-700">${fmtEUR(b.totalCost)}</p>
            <p class="text-xs text-emerald-600 mt-1">= ${tr('Total import', 'Total import')}</p>
          </div>
        </div>
        ${!isAuthenticated() ? `
          <div class="mt-4 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <span class="text-amber-800">${tr('See real listings below market price in each country', 'Voir les annonces sous le prix de marché dans chaque pays')}</span>
            <a href="#/signup" class="ml-3 text-xs px-3 py-1 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition whitespace-nowrap">${tr('Sign up free', 'Inscription gratuite')}</a>
          </div>` : `
          <div class="mt-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
            <span class="text-blue-800">${tr('Access real listings with profit margins and direct links', 'Accédez aux annonces avec marges et liens directs')}</span>
            <a href="#/arbitrage" class="ml-3 text-xs px-3 py-1 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition whitespace-nowrap">${tr('Open Pro Arbitrage →', 'Arbitrage Pro →')}</a>
          </div>`
        }
      </div>`
  }

  resultEl.innerHTML = `
    <!-- Summary header + best badge -->
    <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-4">
      <div class="p-5">
        ${headerTitle}
        ${bestBadge}
      </div>

      <!-- Table header -->
      <div class="flex items-center gap-3 px-4 py-2 bg-zinc-50 border-t border-zinc-100">
        <div class="w-36 sm:w-44 shrink-0 text-xs font-semibold text-zinc-400 uppercase tracking-wide">${tr('Country', 'Pays')}</div>
        <div class="flex-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide">${tr('Market price', 'Prix marché')}</div>
        <div class="hidden sm:block w-28 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">${tr('Import costs', 'Coûts import')}</div>
        <div class="w-28 sm:w-32 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">${tr('Net margin', 'Marge nette')}</div>
        <div class="w-16 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide"></div>
      </div>

      <!-- Rows -->
      <div>
        ${sellRow}
        ${buyRows}
        ${otherRows ? `
          <div class="px-4 py-2 bg-zinc-50 border-t border-zinc-100">
            <p class="text-xs text-zinc-400 font-medium">${tr('Other countries (no sell price set)', 'Autres pays (pas de prix de vente défini)')}</p>
          </div>
          ${otherRows}` : ''
        }
      </div>
    </div>

    ${breakdownHtml}

    <!-- Disclaimer -->
    <p class="text-xs text-zinc-400 text-center mt-4">
      ${tr('Import cost estimates only. Actual costs vary. Consult a professional for regulated markets (NO, DK, CH).',
          'Estimations uniquement. Les coûts réels varient. Consultez un professionnel pour les marchés réglementés (NO, DK, CH).')}
    </p>
  `

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
