import { getAuthToken } from '../main.js'
import { tr, renderLanguageToggle, attachLanguageToggle, getLang, formatNumber, formatCurrency } from '../utils/i18n.js'

const API_BASE = '/api/v1'

/**
 * Render the evaluations comparison page
 */
export function renderEvaluationsCompare() {
  document.body.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <a href="#/" class="flex items-center space-x-2">
              <span class="text-xl sm:text-2xl font-bold text-blue-600">Carindex</span>
            </a>
            <nav class="flex items-center space-x-2 sm:space-x-4">
              ${renderLanguageToggle()}
              <a href="#/evaluations" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('My Evaluations', 'Mes Évaluations')}</a>
              <a href="#/dashboard" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">Dashboard</a>
              <button onclick="window.safeBack('/evaluations')" class="px-3 sm:px-4 py-2 text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">
                <span class="hidden sm:inline">← ${tr('Back', 'Retour')}</span>
                <span class="sm:hidden">←</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">${tr('Evaluation Comparison', 'Comparaison d\'Évaluations')}</h1>
          <p class="text-gray-600">${tr('Compare multiple evaluations side by side', 'Comparez plusieurs évaluations côte à côte')}</p>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="mt-4 text-gray-600">${tr('Loading comparison...', 'Chargement de la comparaison...')}</p>
        </div>

        <!-- Error State -->
        <div id="error-state" class="hidden text-center py-12">
          <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">${tr('Error', 'Erreur')}</h3>
          <p class="mt-2 text-sm text-gray-500" id="error-message"></p>
        </div>

        <!-- Comparison Table -->
        <div id="comparison-content" class="hidden">
          <div class="bg-white rounded-lg shadow overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead id="comparison-header" class="bg-gray-50">
                <!-- Headers will be inserted here -->
              </thead>
              <tbody id="comparison-body" class="bg-white divide-y divide-gray-200">
                <!-- Rows will be inserted here -->
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `

  // Get evaluation IDs from URL
  const urlParams = new URLSearchParams(window.location.search)
  const idsParam = urlParams.get('ids')
  
  if (!idsParam) {
    document.getElementById('loading-state').classList.add('hidden')
    document.getElementById('error-state').classList.remove('hidden')
    document.getElementById('error-message').textContent = tr('No evaluation ID provided', 'Aucun ID d\'évaluation fourni')
    return
  }

  const ids = idsParam.split(',').filter(id => id)
  loadComparison(ids)
  attachLanguageToggle(() => {
    window.location.reload()
  })
}

/**
 * Load comparison data
 */
async function loadComparison(ids) {
  const loadingState = document.getElementById('loading-state')
  const errorState = document.getElementById('error-state')
  const comparisonContent = document.getElementById('comparison-content')
  const errorMessage = document.getElementById('error-message')

  try {
    const token = getAuthToken()
    const response = await fetch(`${API_BASE}/evaluations/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ evaluation_ids: ids })
    })

    if (!response.ok) {
      throw new Error(`${tr('Error', 'Erreur')} ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    loadingState.classList.add('hidden')
    comparisonContent.classList.remove('hidden')
    
    renderComparison(data.evaluations)
  } catch (error) {
    loadingState.classList.add('hidden')
    errorState.classList.remove('hidden')
    errorMessage.textContent = error.message
  }
}

/**
 * Render comparison table
 */
function renderComparison(evaluations) {
  const header = document.getElementById('comparison-header')
  const body = document.getElementById('comparison-body')

  // Build header
  header.innerHTML = `
    <tr>
      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Criteria', 'Critère')}</th>
      ${evaluations.map((evaluation, idx) => `
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          ${evaluation.name || `${tr('Evaluation', 'Évaluation')} ${idx + 1}`}
        </th>
      `).join('')}
    </tr>
  `

  // Build body rows
  const rows = [
    {
      label: tr('Vehicle', 'Véhicule'),
      values: evaluations.map(e => {
        const a = e.auction_listings || {}
        return `${a.brand || '-'} ${a.model || ''} ${a.year || ''}`.trim() || '-'
      })
    },
    {
      label: tr('Year', 'Année'),
      values: evaluations.map(e => e.auction_listings?.year || '-')
    },
    {
      label: tr('Mileage', 'Kilométrage'),
      values: evaluations.map(e => {
        const km = e.auction_listings?.mileage
        return km ? `${formatNumber(km)} km` : '-'
      })
    },
    {
      label: tr('Auction price (SEK)', 'Prix enchère (SEK)'),
      values: evaluations.map(e => {
        const price = e.auction_listings?.auction_price_sek
        return price ? `${formatNumber(price)} SEK` : '-'
      })
    },
    {
      label: tr('Estimated price - Low', 'Prix estimé - Bas'),
      values: evaluations.map(e => formatCurrency(e.price_estimate_low))
    },
    {
      label: tr('Estimated price - Median', 'Prix estimé - Médian'),
      values: evaluations.map(e => formatCurrency(e.price_estimate_mid))
    },
    {
      label: tr('Estimated price - High', 'Prix estimé - Haut'),
      values: evaluations.map(e => formatCurrency(e.price_estimate_high))
    },
    {
      label: tr('Margin - Low', 'Marge - Bas'),
      values: evaluations.map(e => {
        const color = e.margin_low >= 0 ? 'text-green-600' : 'text-red-600'
        return `<span class="${color} font-semibold">${formatCurrency(e.margin_low)}</span>`
      })
    },
    {
      label: tr('Margin - Median', 'Marge - Médian'),
      values: evaluations.map(e => {
        const color = e.margin_mid >= 0 ? 'text-green-600' : 'text-red-600'
        return `<span class="${color} font-semibold">${formatCurrency(e.margin_mid)}</span>`
      })
    },
    {
      label: tr('Margin - High', 'Marge - Haut'),
      values: evaluations.map(e => {
        const color = e.margin_high >= 0 ? 'text-green-600' : 'text-red-600'
        return `<span class="${color} font-semibold">${formatCurrency(e.margin_high)}</span>`
      })
    },
    {
      label: tr('Total costs', 'Coûts totaux'),
      values: evaluations.map(e => {
        const costs = e.costs_breakdown_json || {}
        return formatCurrency(costs.total_eur || 0)
      })
    },
    {
      label: tr('Date', 'Date'),
      values: evaluations.map(e => {
        return new Date(e.created_at).toLocaleDateString(getLang() === 'fr' ? 'fr-FR' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      })
    }
  ]

  body.innerHTML = rows.map(row => `
    <tr>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row.label}</td>
      ${row.values.map(val => `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${val}</td>
      `).join('')}
    </tr>
  `).join('')
}

// Note: formatCurrency is imported from i18n.js
