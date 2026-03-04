import { getAuthToken } from '../main.js'
import { tr, renderLanguageToggle, attachLanguageToggle, getLang, formatNumber, formatCurrency } from '../utils/i18n.js'

const API_BASE = '/api/v1'

/**
 * Render the evaluations manager page
 */
export function renderEvaluationsManager() {
  try {
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
              <button onclick="window.safeBack('/dashboard')" class="px-3 sm:px-4 py-2 text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">
                <span class="hidden sm:inline">← ${tr('Back', 'Retour')}</span>
                <span class="sm:hidden">←</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">${tr('My Evaluations', 'Mes Évaluations')}</h1>
            <p class="text-gray-600">${tr('Manage and compare your margin evaluations', 'Gérez et comparez vos évaluations de marge')}</p>
          </div>
          <div class="flex gap-2">
            <button id="compare-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium hidden">
              ${tr('Compare selected', 'Comparer sélectionnées')}
            </button>
            <a href="#/batch-evaluations" class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition font-medium">
              📊 ${tr('Batch evaluations', 'Évaluations en lot')}
            </a>
            <a href="#/auction-margin" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium">
              ${tr('New evaluation', 'Nouvelle évaluation')}
            </a>
          </div>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="mt-4 text-gray-600">${tr('Loading evaluations...', 'Chargement des évaluations...')}</p>
        </div>

        <!-- Error State -->
        <div id="error-state" class="hidden text-center py-12">
          <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">${tr('Error', 'Erreur')}</h3>
          <p class="mt-2 text-sm text-gray-500" id="error-message"></p>
        </div>

        <!-- Evaluations List -->
        <div id="evaluations-list" class="hidden space-y-4">
          <!-- Evaluations will be inserted here -->
        </div>

        <!-- Evaluation Details Modal -->
        <div id="evaluation-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 class="text-2xl font-bold text-gray-900" id="modal-title">Evaluation details</h2>
              <button onclick="closeEvaluationModal()" class="text-gray-400 hover:text-gray-600 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div id="modal-content" class="p-6">
              <!-- Content will be loaded here -->
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div id="empty-state" class="hidden text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">${tr('No evaluations', 'Aucune évaluation')}</h3>
          <p class="mt-2 text-sm text-gray-500">You haven't saved any evaluation yet.</p>
          <a href="#/auction-margin" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Create an evaluation
          </a>
        </div>
      </main>
    </div>
  `

    loadEvaluations()
    setupEventHandlers()
    
    // Attach language toggle handler
    attachLanguageToggle(() => {
      // Reload page when language changes
      window.location.reload()
    })
  } catch (error) {
    console.error('Error rendering evaluations manager:', error)
    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-red-600 mb-4">${tr('Loading error', 'Erreur de chargement')}</h1>
          <p class="text-gray-600 mb-4">${error.message}</p>
          <a href="#/dashboard" class="text-blue-600 hover:underline">${tr('Back to dashboard', 'Retour au dashboard')}</a>
        </div>
      </div>
    `
  }
}

/**
 * Load evaluations from API
 */
async function loadEvaluations() {
  const loadingState = document.getElementById('loading-state')
  const errorState = document.getElementById('error-state')
  const evaluationsList = document.getElementById('evaluations-list')
  const emptyState = document.getElementById('empty-state')
  const errorMessage = document.getElementById('error-message')

  try {
    if (!loadingState || !errorState || !evaluationsList || !emptyState || !errorMessage) {
      console.error('Required DOM elements not found')
      return
    }

    const token = getAuthToken()
    if (!token) {
      // Redirect to login if not authenticated
      window.location.hash = '#/login?redirect=' + encodeURIComponent(window.location.hash || '#/evaluations')
      return
    }

    let response
    try {
      console.log('Fetching evaluations from:', `${API_BASE}/evaluations`)
      response = await fetch(`${API_BASE}/evaluations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('Response status:', response.status, response.statusText)
    } catch (fetchError) {
      // Network error (backend not reachable, CORS, etc.)
      console.error('Network error fetching evaluations:', fetchError)
      throw new Error('Failed to fetch evaluations')
    }

    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText)
      if (response.status === 401) {
        window.location.hash = '#/login?redirect=' + encodeURIComponent(window.location.hash || window.location.pathname)
        return
      }
      
      let errorData = {}
      try {
        const text = await response.text()
        console.error('Error response body:', text)
        errorData = JSON.parse(text)
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
        errorData = {}
      }
      
      // Handle different error response formats
      let errorMessage = `${tr('Error', 'Erreur')} ${response.status}: ${response.statusText}`
      let errorDetails = null
      
      if (errorData.error) {
        // Error handler format: { error: { code, message, details } }
        if (typeof errorData.error === 'object' && errorData.error.message) {
          errorMessage = errorData.error.message
          errorDetails = errorData.error.details
        } 
        // Controller format: { error: 'string', code: '...', message: '...', details: '...' }
        else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error
          errorDetails = errorData.details || errorData.message
        }
      } else if (errorData.message) {
        errorMessage = errorData.message
        errorDetails = errorData.details
      }
      
      // Create error object with details
      const error = new Error(errorMessage)
      error.details = errorDetails
      error.code = errorData.code || errorData.error?.code
      throw error
    }

    let data
    try {
      const responseText = await response.text()
      console.log('Response text:', responseText.substring(0, 200))
      data = JSON.parse(responseText)
      console.log('Parsed data:', data)
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError)
      throw new Error('Invalid server response (invalid JSON)')
    }
    
    if (loadingState) loadingState.classList.add('hidden')

    if (!data.evaluations || data.evaluations.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden')
      return
    }

    if (evaluationsList) {
      evaluationsList.classList.remove('hidden')
      renderEvaluations(data.evaluations)
    }
  } catch (error) {
    console.error('Error loading evaluations:', error)
    if (loadingState) loadingState.classList.add('hidden')
    if (errorState) {
      errorState.classList.remove('hidden')
      if (errorMessage) {
        // Provide more helpful error messages
        let message = error.message || tr('An error occurred while loading evaluations', 'Une erreur est survenue lors du chargement des évaluations')
        
        // Check for network errors
        if (error.message && error.message.includes('Failed to fetch')) {
          message = 'Unable to connect to server. Check that the backend is running and accessible.'
        } else if (error.message && error.message.includes('fetch')) {
          message = tr('Network connection error. Check your internet connection and that the server is accessible.', 'Erreur de connexion réseau. Vérifiez votre connexion internet et que le serveur est accessible.')
        }
        // Check for migration-related errors
        else if (error.code === 'MIGRATION_REQUIRED' || error.message.includes('migration') || error.message.includes('user_id')) {
          message = 'Database migration required. The user_id column does not exist in the margin_calculations table.'
          if (error.details) {
            message += '\n\n' + error.details
          }
        }
        
        errorMessage.textContent = message
        
        // Add a retry button
        const retryBtn = document.createElement('button')
        retryBtn.className = 'mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition'
        retryBtn.textContent = 'Retry'
        retryBtn.onclick = () => {
          errorState.classList.add('hidden')
          loadingState.classList.remove('hidden')
          loadEvaluations()
        }
        
        // Remove existing retry button if any
        const existingRetry = errorState.querySelector('button')
        if (existingRetry) {
          existingRetry.remove()
        }
        
        errorState.appendChild(retryBtn)
      }
    }
  }
}

/**
 * Render evaluations list
 */
function renderEvaluations(evaluations) {
  const container = document.getElementById('evaluations-list')
  container.innerHTML = evaluations.map(evaluation => {
    const auction = evaluation.auction_listings || {}
    const date = new Date(evaluation.created_at).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    const marginColor = evaluation.margin_mid >= 0 ? 'text-green-600' : 'text-red-600'
    
    return `
      <div class="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <input type="checkbox" class="evaluation-checkbox" data-id="${evaluation.id}" 
                     onchange="updateCompareButton()">
              <h3 class="text-lg font-semibold text-gray-900">
                ${evaluation.name || `${auction.brand || ''} ${auction.model || ''} ${auction.year || ''}`.trim() || 'Unnamed evaluation'}
              </h3>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p class="text-xs text-gray-500">Véhicule</p>
                <p class="text-sm font-medium">${auction.brand || '-'} ${auction.model || ''} ${auction.year || ''}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Marge médiane</p>
                <p class="text-sm font-semibold ${marginColor}">${formatCurrency(evaluation.margin_mid)}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Prix estimé médian</p>
                <p class="text-sm font-medium">${formatCurrency(evaluation.price_estimate_mid)}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Date</p>
                <p class="text-sm text-gray-600">${date}</p>
              </div>
            </div>
          </div>
          <div class="flex gap-2 ml-4">
            <button class="recalculate-evaluation-btn px-3 py-2 text-green-600 hover:bg-green-50 rounded-md transition"
                    data-evaluation-id="${evaluation.id}"
                    title="Recalculate with new validation rules">
              🔄 Recalculate
            </button>
            <button class="view-evaluation-btn px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition"
                    data-evaluation-id="${evaluation.id}">
              ${tr('View', 'Voir')}
            </button>
            <button class="delete-evaluation-btn px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition"
                    data-evaluation-id="${evaluation.id}">
              ${tr('Delete', 'Supprimer')}
            </button>
          </div>
        </div>
      </div>
    `
  }).join('')
}

/**
 * Setup event handlers
 */
function setupEventHandlers() {
  const compareBtn = document.getElementById('compare-btn')
  if (compareBtn) {
    compareBtn.addEventListener('click', handleCompare)
  }
  
  // Use event delegation for dynamically created buttons
  document.addEventListener('click', (e) => {
    // Recalculate evaluation button
    if (e.target.classList.contains('recalculate-evaluation-btn') || e.target.closest('.recalculate-evaluation-btn')) {
      const btn = e.target.classList.contains('recalculate-evaluation-btn') ? e.target : e.target.closest('.recalculate-evaluation-btn')
      const id = btn.dataset.evaluationId
      if (id) {
        e.preventDefault()
        recalculateEvaluation(id)
      }
    }
    
    // View evaluation button - navigate to full page instead of modal
    if (e.target.classList.contains('view-evaluation-btn') || e.target.closest('.view-evaluation-btn')) {
      const btn = e.target.classList.contains('view-evaluation-btn') ? e.target : e.target.closest('.view-evaluation-btn')
      const id = btn.dataset.evaluationId
      if (id) {
        e.preventDefault()
        // Navigate to full page instead of opening modal
        window.location.hash = `#/evaluations/${id}`
        window.location.reload()
      }
    }
    
    // Delete evaluation button
    if (e.target.classList.contains('delete-evaluation-btn') || e.target.closest('.delete-evaluation-btn')) {
      const btn = e.target.classList.contains('delete-evaluation-btn') ? e.target : e.target.closest('.delete-evaluation-btn')
      const id = btn.dataset.evaluationId
      if (id) {
        e.preventDefault()
        if (confirm(tr('Are you sure you want to delete this evaluation?', 'Êtes-vous sûr de vouloir supprimer cette évaluation ?'))) {
          deleteEvaluation(id)
        }
      }
    }
  })
  
  // Close modal when clicking outside
  const modal = document.getElementById('evaluation-modal')
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeEvaluationModal()
      }
    })
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEvaluationModal()
    }
  })
}

/**
 * Update compare button visibility
 */
window.updateCompareButton = function() {
  const checkboxes = document.querySelectorAll('.evaluation-checkbox:checked')
  const compareBtn = document.getElementById('compare-btn')
  
  if (checkboxes.length >= 2) {
    compareBtn.classList.remove('hidden')
  } else {
    compareBtn.classList.add('hidden')
  }
}

/**
 * View evaluation details
 */
window.viewEvaluation = async function(id) {
  console.log('viewEvaluation called with ID:', id, 'Type:', typeof id)
  
  // Sanitize ID - remove any quotes or whitespace
  if (typeof id === 'string') {
    id = id.trim().replace(/^['"]|['"]$/g, '')
  }
  
  const modal = document.getElementById('evaluation-modal')
  const modalContent = document.getElementById('modal-content')
  const modalTitle = document.getElementById('modal-title')
  
  if (!modal || !modalContent || !modalTitle) {
    console.error('Modal elements not found')
    return
  }
  
  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    console.error('Invalid UUID format:', id)
    modal.classList.remove('hidden')
    modalContent.innerHTML = `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">Erreur</h3>
        <p class="mt-2 text-sm text-gray-500">Invalid evaluation ID. Expected format: UUID.</p>
        <p class="mt-2 text-xs text-gray-400">ID reçu: ${id}</p>
        <button onclick="closeEvaluationModal()" class="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">
          Fermer
        </button>
      </div>
    `
    return
  }
  
  // Show loading state
  modal.classList.remove('hidden')
  modalContent.innerHTML = `
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">${tr('Loading details...', 'Chargement des détails...')}</p>
    </div>
  `
  
  try {
    const token = getAuthToken()
    if (!token) {
      throw new Error('Not authenticated')
    }
    
    // Validate ID format (should be UUID)
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid evaluation ID')
    }
    
    console.log('Fetching evaluation with ID:', id)
    
    const response = await fetch(`${API_BASE}/evaluations/${id}`, {
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
        errorMessage = 'Evaluation not found. It may have been deleted.'
      } else if (response.status === 401) {
        window.location.hash = '#/login?redirect=' + encodeURIComponent(window.location.hash)
        return
      } else if (response.status === 400) {
        errorMessage = 'Invalid evaluation ID. Expected format: UUID.'
      }
      
      throw new Error(errorMessage)
    }
    
    const data = await response.json()
    
    if (!data.evaluation) {
      console.error('No evaluation in response:', data)
      throw new Error('Invalid server response')
    }
    
    const evaluation = data.evaluation
    const auction = evaluation.auction_listings || {}
    const comparables = evaluation.comparable_listings || []
    
    // Extract costs from costs_breakdown_json if available
    const costs = evaluation.costs_breakdown_json || {}
    
    console.log('Evaluation loaded successfully:', evaluation.id)
    
    // Format date
    const date = new Date(evaluation.created_at).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }
    
    // Build modal content
    modalTitle.textContent = evaluation.name || `${auction.brand || ''} ${auction.model || ''} ${auction.year || ''}`.trim() || 'Evaluation details'
    
    modalContent.innerHTML = `
      <div class="space-y-6">
        <!-- Vehicle Info -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold mb-3">Informations du véhicule</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p class="text-xs text-gray-500">Marque</p>
              <p class="text-sm font-medium">${auction.brand || '-'}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Modèle</p>
              <p class="text-sm font-medium">${auction.model || '-'}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Année</p>
              <p class="text-sm font-medium">${auction.year || '-'}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Kilométrage</p>
              <p class="text-sm font-medium">${auction.mileage ? auction.mileage.toLocaleString('fr-FR') + ' km' : '-'}</p>
            </div>
          </div>
          ${auction.url ? `
          <div class="mt-4 pt-4 border-t border-gray-200">
            <p class="text-xs text-gray-500 mb-1">URL de l'enchère</p>
            <a href="${auction.url}" target="_blank" rel="noopener noreferrer" 
               class="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all">
              ${auction.url}
            </a>
          </div>
          ` : ''}
        </div>
        
        <!-- Price Estimates -->
        <div>
          <h3 class="text-lg font-semibold mb-3">Estimation de prix</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600">Bas</p>
              <p class="text-2xl font-bold text-blue-600">${formatCurrency(evaluation.price_estimate_low)}</p>
            </div>
            <div class="bg-green-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600">Médian</p>
              <p class="text-2xl font-bold text-green-600">${formatCurrency(evaluation.price_estimate_mid)}</p>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600">Haut</p>
              <p class="text-2xl font-bold text-purple-600">${formatCurrency(evaluation.price_estimate_high)}</p>
            </div>
          </div>
        </div>
        
        <!-- Margins -->
        <div>
          <h3 class="text-lg font-semibold mb-3">Marge</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600">Bas</p>
              <p class="text-2xl font-bold ${evaluation.margin_low >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${formatCurrency(evaluation.margin_low)}
              </p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600">Médian</p>
              <p class="text-2xl font-bold ${evaluation.margin_mid >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${formatCurrency(evaluation.margin_mid)}
              </p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600">Haut</p>
              <p class="text-2xl font-bold ${evaluation.margin_high >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${formatCurrency(evaluation.margin_high)}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Costs Breakdown -->
        <div>
          <h3 class="text-lg font-semibold mb-3">Détail des coûts</h3>
          <div class="bg-gray-50 p-4 rounded-lg space-y-2">
            <div class="flex justify-between">
              <span>Prix enchère (HT):</span>
              <span class="font-semibold">${formatCurrency(costs.auction_price_eur || 0)}</span>
            </div>
            <div class="flex justify-between">
              <span>Frais enchère:</span>
              <span class="font-semibold">${formatCurrency(costs.auction_fee_eur || 0)}</span>
            </div>
            <div class="flex justify-between">
              <span>Transport:</span>
              <span class="font-semibold">${formatCurrency(costs.transport_eur || 0)}</span>
            </div>
            <div class="flex justify-between">
              <span>Immatriculation:</span>
              <span class="font-semibold">${formatCurrency(costs.registration_eur || 0)}</span>
            </div>
            <div class="flex justify-between">
              <span>Réconditionnement:</span>
              <span class="font-semibold">${formatCurrency(costs.reconditioning_total_eur || 0)}</span>
            </div>
            ${costs.malus_eur ? `
            <div class="flex justify-between">
              <span>Malus écologique:</span>
              <span class="font-semibold">${formatCurrency(costs.malus_eur || 0)}</span>
            </div>
            ` : ''}
            <div class="flex justify-between border-t pt-2 mt-2">
              <span class="font-semibold">Total:</span>
              <span class="font-bold text-lg">${formatCurrency(costs.total_eur || 0)}</span>
            </div>
          </div>
        </div>
        
        <!-- Comparables -->
        ${comparables.length > 0 ? `
        <div>
          <h3 class="text-lg font-semibold mb-3">Comparables (${comparables.length})</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Année</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Km</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
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
                    <td class="px-4 py-2 text-sm">${c.mileage_km ? c.mileage_km.toLocaleString('fr-FR') + ' km' : '-'}</td>
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
        <div class="text-sm text-gray-500 border-t pt-4">
          <p>Date de création: ${date}</p>
          ${evaluation.notes ? `<p class="mt-2">Notes: ${evaluation.notes}</p>` : ''}
        </div>
      </div>
    `
  } catch (error) {
    console.error('Error loading evaluation details:', error)
    console.error('Evaluation ID that failed:', id)
    modalContent.innerHTML = `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">Erreur</h3>
        <p class="mt-2 text-sm text-gray-500">${error.message || 'Unable to load evaluation details'}</p>
        <p class="mt-2 text-xs text-gray-400">ID: ${id}</p>
        <button onclick="closeEvaluationModal()" class="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">
          Fermer
        </button>
      </div>
    `
  }
}

/**
 * Close evaluation modal
 */
window.closeEvaluationModal = function() {
  const modal = document.getElementById('evaluation-modal')
  if (modal) {
    modal.classList.add('hidden')
  }
}

/**
 * Recalculate evaluation with updated validation rules
 */
window.recalculateEvaluation = async function(id) {
  // Sanitize ID
  if (typeof id === 'string') {
    id = id.trim().replace(/^['"]|['"]$/g, '')
  }

  if (!confirm('Recalculate this evaluation with the new price validation rules?')) {
    return
  }

  try {
    const token = getAuthToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    console.log('Recalculating evaluation with ID:', id)

    // Show loading state
    const btn = document.querySelector(`[data-evaluation-id="${id}"].recalculate-evaluation-btn`)
    if (btn) {
      btn.disabled = true
      btn.textContent = '⏳ Recalcul...'
    }

    const response = await fetch(`${API_BASE}/evaluations/${id}/recalculate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      let errorMessage = tr('Error during recalculation', 'Erreur lors du recalcul')
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    
    // Show success message
    alert('Evaluation recalculated successfully! The new prices reflect the improved validation rules. Mileage has been updated from the auction URL.')
    
    // Close modal if open
    closeEvaluationModal()

    // Reload list to show updated values (including updated mileage)
    await loadEvaluations()
  } catch (error) {
    console.error('Error recalculating evaluation:', error)
    alert(`${tr('Error during recalculation:', 'Erreur lors du recalcul :')} ${error.message}`)
    
    // Reset button state
    const btn = document.querySelector(`[data-evaluation-id="${id}"].recalculate-evaluation-btn`)
    if (btn) {
      btn.disabled = false
      btn.innerHTML = '🔄 Recalculate'
    }
  }
}

/**
 * Delete evaluation
 */
window.deleteEvaluation = async function(id) {
  // Sanitize ID
  if (typeof id === 'string') {
    id = id.trim().replace(/^['"]|['"]$/g, '')
  }

  if (!confirm(tr('Are you sure you want to delete this evaluation?', 'Êtes-vous sûr de vouloir supprimer cette évaluation ?'))) {
    return
  }

  try {
    const token = getAuthToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    console.log('Deleting evaluation with ID:', id)

    const response = await fetch(`${API_BASE}/evaluations/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      let errorMessage = tr('Error during deletion', 'Erreur lors de la suppression')
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage)
    }

    // Reload list
    loadEvaluations()
  } catch (error) {
    console.error('Error deleting evaluation:', error)
    alert(tr('Error during deletion:', 'Erreur lors de la suppression:') + ' ' + error.message)
  }
}

/**
 * Handle compare button click
 */
async function handleCompare() {
  const checkboxes = document.querySelectorAll('.evaluation-checkbox:checked')
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id)
  
  if (ids.length < 2) {
    alert(tr('Select at least 2 evaluations to compare', 'Sélectionnez au moins 2 évaluations à comparer'))
    return
  }

  window.location.hash = `#/evaluations/compare?ids=${ids.join(',')}`
  window.location.reload()
}

// Note: formatCurrency is imported from i18n.js
