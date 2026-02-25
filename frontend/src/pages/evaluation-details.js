import { getAuthToken } from '../main.js'
import { tr, renderLanguageToggle, attachLanguageToggle, getLang, formatNumber, formatCurrency } from '../utils/i18n.js'

const API_BASE = '/api/v1'

/**
 * Render evaluation details page
 */
export function renderEvaluationDetails() {
  // Extract evaluation ID from URL hash
  // Format: #/evaluations/:id
  const hash = window.location.hash
  const match = hash.match(/#\/evaluations\/([^/?]+)/)
  const evaluationId = match ? match[1] : null

  if (!evaluationId) {
    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-red-600 mb-4">${tr('Missing evaluation ID', 'ID d\'évaluation manquant')}</h1>
          <p class="text-gray-600 mb-4">${tr('The URL does not contain a valid evaluation ID.', 'L\'URL ne contient pas d\'ID d\'évaluation valide.')}</p>
          <a href="#/evaluations" class="text-blue-600 hover:underline">${tr('Back to evaluations', 'Retour aux évaluations')}</a>
        </div>
      </div>
    `
    return
  }

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
              <a href="#/search" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('Search', 'Recherche')}</a>
              <a href="#/dashboard" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">Dashboard</a>
              <a href="#/auction-margin" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('Calculator', 'Calculateur')}</a>
              <a href="#/evaluations" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('My Evaluations', 'Mes Évaluations')}</a>
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
        <!-- Loading State -->
        <div id="loading-state" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="mt-4 text-gray-600">${tr('Loading details...', 'Chargement des détails...')}</p>
        </div>

        <!-- Error State -->
        <div id="error-state" class="hidden text-center py-12">
          <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">${tr('Error', 'Erreur')}</h3>
          <p class="mt-2 text-sm text-gray-500" id="error-message"></p>
          <a href="#/evaluations" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            ${tr('Back to evaluations', 'Retour aux évaluations')}
          </a>
        </div>

        <!-- Content -->
        <div id="content" class="hidden">
          <!-- Content will be loaded here -->
        </div>
      </main>
    </div>
  `

  loadEvaluationDetails(evaluationId)
  attachLanguageToggle(() => {
    window.location.reload()
  })
}

/**
 * Load evaluation details from API
 */
async function loadEvaluationDetails(evaluationId) {
  const loadingState = document.getElementById('loading-state')
  const errorState = document.getElementById('error-state')
  const content = document.getElementById('content')
  const errorMessage = document.getElementById('error-message')

  try {
    const token = getAuthToken()
    if (!token) {
      window.location.hash = '#/login?redirect=' + encodeURIComponent(window.location.hash)
      return
    }

    // Sanitize ID
    if (typeof evaluationId === 'string') {
      evaluationId = evaluationId.trim().replace(/^['"]|['"]$/g, '')
    }

    console.log('Fetching evaluation with ID:', evaluationId)

    const response = await fetch(`${API_BASE}/evaluations/${evaluationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      let errorMessage = tr('Error loading', 'Erreur lors du chargement')
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
        console.error('API Error:', errorData)
      } catch (e) {
        console.error('Failed to parse error response:', e)
      }

      if (response.status === 404) {
        errorMessage = tr('Evaluation not found. It may have been deleted.', 'Évaluation non trouvée. Elle a peut-être été supprimée.')
      } else if (response.status === 401) {
        window.location.hash = '#/login?redirect=' + encodeURIComponent(window.location.hash)
        return
      } else if (response.status === 400) {
        errorMessage = tr('Invalid evaluation ID. Expected format: UUID.', 'ID d\'évaluation invalide. Format attendu: UUID.')
      }

      throw new Error(errorMessage)
    }

    const data = await response.json()

    if (!data.evaluation) {
      console.error('No evaluation in response:', data)
      throw new Error(tr('Invalid server response', 'Réponse invalide du serveur'))
    }

    const evaluation = data.evaluation
    const auction = evaluation.auction_listings || {}
    const comparables = evaluation.comparable_listings || []

    // Extract costs from costs_breakdown_json if available
    const costs = evaluation.costs_breakdown_json || {}

    console.log('Evaluation loaded successfully:', evaluation.id)

    if (loadingState) loadingState.classList.add('hidden')
    if (errorState) errorState.classList.add('hidden')
    if (content) {
      content.classList.remove('hidden')
      renderEvaluationContent(evaluation, auction, comparables, costs)
    }
  } catch (error) {
    console.error('Error loading evaluation details:', error)
    if (loadingState) loadingState.classList.add('hidden')
    if (errorState) {
      errorState.classList.remove('hidden')
      if (errorMessage) {
        errorMessage.textContent = error.message || tr('Unable to load evaluation details', 'Impossible de charger les détails de l\'évaluation')
      }
    }
  }
}

/**
 * Render evaluation content
 */
function renderEvaluationContent(evaluation, auction, comparables, costs) {
  const content = document.getElementById('content')

  // Format date
  const date = new Date(evaluation.created_at).toLocaleDateString(getLang() === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const title = evaluation.name || `${auction.brand || ''} ${auction.model || ''} ${auction.year || ''}`.trim() || tr('Evaluation details', 'Détails de l\'évaluation')

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">${title}</h1>
          <p class="text-gray-600">${tr('Created on', 'Créée le')} ${date}</p>
        </div>
        <div class="flex gap-2">
          <a href="#/evaluations" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">
            ← ${tr('Back', 'Retour')}
          </a>
        </div>
      </div>

      <!-- Vehicle Info -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">${tr('Vehicle information', 'Informations du véhicule')}</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p class="text-xs text-gray-500">${tr('Brand', 'Marque')}</p>
            <p class="text-sm font-medium">${auction.brand || '-'}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">${tr('Model', 'Modèle')}</p>
            <p class="text-sm font-medium">${auction.model || '-'}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">${tr('Year', 'Année')}</p>
            <p class="text-sm font-medium">${auction.year || '-'}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">${tr('Mileage', 'Kilométrage')}</p>
            <p class="text-sm font-medium">${auction.mileage ? formatNumber(auction.mileage) + ' km' : '-'}</p>
          </div>
        </div>
        ${auction.url ? `
        <div class="mt-4 pt-4 border-t border-gray-200">
          <p class="text-xs text-gray-500 mb-1">${tr('Auction URL', 'URL de l\'enchère')}</p>
          <a href="${auction.url}" target="_blank" rel="noopener noreferrer" 
             class="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all">
            ${auction.url}
          </a>
        </div>
        ` : ''}
      </div>

      <!-- Price Estimates -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">${tr('Price estimate', 'Estimation de prix')}</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600">${tr('Low', 'Bas')}</p>
            <p class="text-2xl font-bold text-blue-600">${formatCurrency(evaluation.price_estimate_low)}</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600">${tr('Median', 'Médian')}</p>
            <p class="text-2xl font-bold text-green-600">${formatCurrency(evaluation.price_estimate_mid)}</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600">${tr('High', 'Haut')}</p>
            <p class="text-2xl font-bold text-purple-600">${formatCurrency(evaluation.price_estimate_high)}</p>
          </div>
        </div>
      </div>

      <!-- Margins -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">${tr('Margin', 'Marge')}</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600">${tr('Low', 'Bas')}</p>
            <p class="text-2xl font-bold ${evaluation.margin_low >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${formatCurrency(evaluation.margin_low)}
            </p>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600">${tr('Median', 'Médian')}</p>
            <p class="text-2xl font-bold ${evaluation.margin_mid >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${formatCurrency(evaluation.margin_mid)}
            </p>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600">${tr('High', 'Haut')}</p>
            <p class="text-2xl font-bold ${evaluation.margin_high >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${formatCurrency(evaluation.margin_high)}
            </p>
          </div>
        </div>
      </div>

      <!-- Costs Breakdown -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">${tr('Cost breakdown', 'Détail des coûts')}</h2>
        <div class="bg-gray-50 p-4 rounded-lg space-y-2">
          <div class="flex justify-between">
            <span>${tr('Auction price (ex. VAT):', 'Prix enchère (HT):')}</span>
            <span class="font-semibold">${formatCurrency(costs.auction_price_eur || 0)}</span>
          </div>
          <div class="flex justify-between">
            <span>${tr('Auction fees:', 'Frais enchère:')}</span>
            <span class="font-semibold">${formatCurrency(costs.auction_fee_eur || 0)}</span>
          </div>
          <div class="flex justify-between">
            <span>${tr('Transport:', 'Transport:')}</span>
            <span class="font-semibold">${formatCurrency(costs.transport_eur || 0)}</span>
          </div>
          <div class="flex justify-between">
            <span>${tr('Registration:', 'Immatriculation:')}</span>
            <span class="font-semibold">${formatCurrency(costs.registration_eur || 0)}</span>
          </div>
          <div class="flex justify-between">
            <span>${tr('Reconditioning:', 'Réconditionnement:')}</span>
            <span class="font-semibold">${formatCurrency(costs.reconditioning_total_eur || 0)}</span>
          </div>
          ${costs.malus_eur ? `
          <div class="flex justify-between">
            <span>${tr('Ecological malus:', 'Malus écologique:')}</span>
            <span class="font-semibold">${formatCurrency(costs.malus_eur || 0)}</span>
          </div>
          ` : ''}
          <div class="flex justify-between border-t pt-2 mt-2">
            <span class="font-semibold">${tr('Total:', 'Total:')}</span>
            <span class="font-bold text-lg">${formatCurrency(costs.total_eur || 0)}</span>
          </div>
        </div>
      </div>

      <!-- Comparables -->
      ${comparables.length > 0 ? `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">${tr('Comparables', 'Comparables')} (${comparables.length})</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Title', 'Titre')}</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Price', 'Prix')}</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Year', 'Année')}</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Km', 'Km')}</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Dept', 'Dépt')}</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Score', 'Score')}</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${comparables.map(c => `
                <tr>
                  <td class="px-4 py-2 text-sm">
                    <a href="${c.url}" target="_blank" class="text-blue-600 hover:underline">${c.title || '-'}</a>
                  </td>
                  <td class="px-4 py-2 text-sm">${formatCurrency(c.price_eur || 0)}</td>
                  <td class="px-4 py-2 text-sm">${c.year || '-'}</td>
                  <td class="px-4 py-2 text-sm">${c.mileage_km ? formatNumber(c.mileage_km) + ' km' : '-'}</td>
                  <td class="px-4 py-2 text-sm">${c.location_department || '-'}</td>
                  <td class="px-4 py-2 text-sm">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      ${((c.match_score || 0) * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- Metadata -->
      ${evaluation.notes ? `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">${tr('Notes', 'Notes')}</h2>
        <p class="text-gray-600">${evaluation.notes}</p>
      </div>
      ` : ''}
    </div>
  `
}
