import { getAuthToken, getUser, isAdmin } from '../main.js'
import { tr, getLang, renderLanguageToggle, attachLanguageToggle, formatCurrency, capitalize } from '../utils/i18n.js'

export async function renderDashboard() {
  const app = document.getElementById('app')
  const user = getUser()
  
  if (!user) {
    window.location.hash = '#/login'
    return
  }
  
  // Always check fresh user data from API to get latest role
  // This handles cases where role was added after login
  const token = getAuthToken()
  if (token) {
    try {
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const freshUser = data.user
        
        console.log('🔍 User data from API:', freshUser)
        console.log('🔍 User role:', freshUser?.role)
        
        // Update localStorage with fresh user data (including role)
        if (freshUser) {
          localStorage.setItem('carindex_user', JSON.stringify(freshUser))
          
          // Redirect to admin if role is admin
          if (freshUser.role === 'admin') {
            console.log('✅ Admin detected, redirecting to admin dashboard...')
            window.location.hash = '#/admin'
            window.location.reload()
            return
          } else {
            console.log('ℹ️ User role is:', freshUser.role, '- staying on regular dashboard')
          }
        }
      } else {
        console.warn('⚠️ Could not fetch user data, status:', response.status)
      }
    } catch (error) {
      console.warn('❌ Could not fetch user data:', error)
    }
  }
  
  // Also check localStorage role (for immediate redirect if already loaded)
  if (isAdmin()) {
    window.location.hash = '#/admin'
    window.location.reload()
    return
  }
  
  app.innerHTML = `
    <!-- Navigation -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <nav class="container mx-auto px-4 sm:px-6 py-4">
        <div class="flex items-center justify-between">
          <a href="#/" class="flex items-center space-x-2">
            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg sm:text-xl">C</span>
            </div>
            <span class="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Carindex</span>
          </a>
          <div class="flex items-center space-x-2 sm:space-x-4">
            <a href="#/search" class="hidden sm:inline text-gray-600 hover:text-blue-600 transition text-sm sm:text-base">${tr('Search', 'Rechercher')}</a>
            <a href="#/market-insights" class="hidden sm:inline text-gray-600 hover:text-blue-600 transition text-sm sm:text-base">${tr('Market Insights', 'Market Insights')}</a>
            <a href="#/arbitrage" class="hidden sm:inline text-gray-600 hover:text-blue-600 transition text-sm sm:text-base">${tr('Arbitrage', 'Arbitrage')}</a>
            <a href="#/auction-margin" class="hidden sm:inline text-gray-600 hover:text-blue-600 transition text-sm sm:text-base">${tr('Margin Calculator', 'Calculateur de Marge')}</a>
            <a href="#/evaluations" class="hidden sm:inline text-gray-600 hover:text-blue-600 transition text-sm sm:text-base">${tr('My Evaluations', 'Mes Évaluations')}</a>
            <span class="hidden sm:inline text-gray-600 text-sm">${user.email}</span>
            ${renderLanguageToggle()}
            <button onclick="window.logout()" class="px-3 sm:px-4 py-2 text-gray-600 hover:text-blue-600 transition text-sm sm:text-base">${tr('Logout', 'Déconnexion')}</button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <div class="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div class="container mx-auto px-4 sm:px-6">
        <!-- Page Header -->
        <div class="mb-6 sm:mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p class="text-sm sm:text-base text-gray-600">${tr('Welcome,', 'Bienvenue,')} ${user.email}</p>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="mt-4 text-gray-600">${tr('Loading...', 'Chargement...')}</p>
        </div>

        <!-- Error State -->
        <div id="error-state" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p id="error-message"></p>
        </div>

        <!-- Dashboard Content -->
        <div id="dashboard-content" class="hidden">
          <!-- Statistics Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <!-- Searches Card -->
            <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900">${tr('Searches this month', 'Recherches ce mois')}</h3>
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <div class="text-3xl font-bold text-gray-900" id="searches-count">-</div>
              <div class="text-sm text-gray-500 mt-2" id="searches-limit">${tr('Limit:', 'Limite:')} -</div>
              <div class="mt-4">
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full transition-all" id="searches-progress" style="width: 0%"></div>
                </div>
              </div>
            </div>

            <!-- Alerts Card -->
            <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900">${tr('Active alerts', 'Alertes actives')}</h3>
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
              </div>
              <div class="text-3xl font-bold text-gray-900" id="alerts-count">-</div>
              <div class="text-sm text-gray-500 mt-2" id="alerts-limit">${tr('Limit:', 'Limite:')} -</div>
              <div class="mt-4">
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-green-600 h-2 rounded-full transition-all" id="alerts-progress" style="width: 0%"></div>
                </div>
              </div>
            </div>

            <!-- Plan Card -->
            <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900">${tr('Current plan', 'Plan actuel')}</h3>
                <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <div class="text-2xl font-bold text-gray-900 capitalize" id="plan-name">-</div>
              <a href="#/pricing" class="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
                ${tr('View plans →', 'Voir les plans →')}
              </a>
            </div>
          </div>

          <!-- Recent Searches -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900">${tr('Recent searches', 'Recherches récentes')}</h2>
              <a href="#/search" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                ${tr('New search →', 'Nouvelle recherche →')}
              </a>
            </div>
            <div id="recent-searches-list" class="space-y-4">
              <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <p>${tr('No recent searches', 'Aucune recherche récente')}</p>
              </div>
            </div>
          </div>

          <!-- Fastest Selling Models Widget -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900">⚡ ${tr('Fastest-selling models', 'Modèles qui se Vendent le Plus Vite')}</h2>
              <a href="#/market-insights" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                ${tr('View all insights →', 'Voir tous les insights →')}
              </a>
            </div>
            <div id="fastest-models-widget" class="space-y-3">
              <div class="text-center py-8 text-gray-500">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2">${tr('Loading...', 'Chargement...')}</p>
              </div>
            </div>
          </div>

          <!-- Active Alerts -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900">${tr('Active alerts', 'Alertes actives')}</h2>
              <button id="create-alert-btn" class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                ${tr('+ Create an alert', '+ Créer une alerte')}
              </button>
            </div>
            <div id="alerts-list" class="space-y-4">
              <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                <p>${tr('No active alerts', 'Aucune alerte active')}</p>
                <button onclick="document.getElementById('create-alert-btn').click()" class="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  ${tr('Create your first alert', 'Créer votre première alerte')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  // Load dashboard data
  attachLanguageToggle(() => window.location.reload())
  loadDashboardData()
}

async function loadDashboardData() {
  const loadingState = document.getElementById('loading-state')
  const errorState = document.getElementById('error-state')
  const dashboardContent = document.getElementById('dashboard-content')
  const errorMessage = document.getElementById('error-message')
  const token = getAuthToken()

  if (!token) {
    window.location.hash = '#/login'
    return
  }

  try {
    // Load stats
    const statsResponse = await fetch('/api/v1/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!statsResponse.ok) {
      throw new Error(tr('Failed to load stats', 'Erreur lors du chargement des statistiques'))
    }

    const statsData = await statsResponse.json()
    const stats = statsData.stats

    // Update stats cards
    document.getElementById('searches-count').textContent = stats.searches.count
    document.getElementById('searches-limit').textContent = 
      stats.searches.limit === -1 ? tr('Unlimited', 'Illimité') : `${tr('Limit:', 'Limite:')} ${stats.searches.limit}`
    
    const searchesProgress = stats.searches.limit === -1 ? 0 : 
      Math.min(100, (stats.searches.count / stats.searches.limit) * 100)
    document.getElementById('searches-progress').style.width = searchesProgress + '%'

    document.getElementById('alerts-count').textContent = stats.alerts.count
    document.getElementById('alerts-limit').textContent = 
      stats.alerts.limit === -1 ? tr('Unlimited', 'Illimité') : `${tr('Limit:', 'Limite:')} ${stats.alerts.limit}`
    
    const alertsProgress = stats.alerts.limit === -1 ? 0 : 
      Math.min(100, (stats.alerts.count / stats.alerts.limit) * 100)
    document.getElementById('alerts-progress').style.width = alertsProgress + '%'

    const planNames = {
      starter: 'Starter',
      pro: 'Pro',
      plus: 'Plus'
    }
    document.getElementById('plan-name').textContent = planNames[stats.plan] || stats.plan

    // Load recent searches
    const searchesResponse = await fetch('/api/v1/dashboard/recent-searches', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (searchesResponse.ok) {
      const searchesData = await searchesResponse.json()
      renderRecentSearches(searchesData.searches || [])
    }

    // Load alerts
    const alertsResponse = await fetch('/api/v1/dashboard/alerts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (alertsResponse.ok) {
      const alertsData = await alertsResponse.json()
      renderAlerts(alertsData.alerts || [])
    }

    // Load fastest selling models widget
    const fastestModelsResponse = await fetch('/api/v1/analytics/fastest-selling-models?limit=5&days=30', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (fastestModelsResponse.ok) {
      const fastestData = await fastestModelsResponse.json()
      renderFastestModelsWidget(fastestData.models || [])
    }

    // Hide loading, show content
    loadingState.classList.add('hidden')
    dashboardContent.classList.remove('hidden')

  } catch (error) {
    console.error('Error loading dashboard:', error)
    loadingState.classList.add('hidden')
    errorState.classList.remove('hidden')
    errorMessage.textContent = error.message || tr('An error occurred', 'Une erreur est survenue')
  }
}

function renderRecentSearches(searches) {
  const container = document.getElementById('recent-searches-list')
  
  if (searches.length === 0) {
    return // Keep default empty state
  }

  container.innerHTML = searches.map(search => {
    const criteria = search.search_criteria || {}
    const brand = criteria.brand ? (Array.isArray(criteria.brand) ? criteria.brand.join(', ') : criteria.brand) : tr('All brands', 'Toutes marques')
    const model = criteria.model ? (Array.isArray(criteria.model) ? criteria.model.join(', ') : criteria.model) : tr('All models', 'Tous modèles')
    const locale = getLang() === 'fr' ? 'fr-FR' : 'en-US'
    const date = new Date(search.created_at).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })

    return `
      <div class="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div class="flex-1">
            <div class="font-medium text-gray-900 text-sm sm:text-base">${brand} ${model}</div>
            <div class="text-xs sm:text-sm text-gray-500 mt-1">${search.results_count || 0} ${tr('results', 'résultats')} • ${date}</div>
          </div>
          <a href="#/search" class="text-blue-600 hover:text-blue-700 text-sm font-medium self-start sm:self-center">
            ${tr('Run again →', 'Relancer →')}
          </a>
        </div>
      </div>
    `
  }).join('')
}

function renderFastestModelsWidget(models) {
  const container = document.getElementById('fastest-models-widget')
  if (!container) return

  if (models.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-500 text-sm">
        <p>${tr('No data available yet', 'Aucune donnée disponible pour le moment')}</p>
        <p class="text-xs mt-2">${tr('Data will appear after a few recorded sales', 'Les données apparaîtront après quelques ventes enregistrées')}</p>
      </div>
    `
    return
  }

  container.innerHTML = models.map((model, index) => {
    // Color code DOM: green for fast (< 20 days), yellow for medium (20-40), red for slow (> 40)
    let domColor = 'text-gray-600'
    let domBg = 'bg-gray-100'
    if (model.averageDOM < 20) {
      domColor = 'text-green-700'
      domBg = 'bg-green-100'
    } else if (model.averageDOM < 40) {
      domColor = 'text-yellow-700'
      domBg = 'bg-yellow-100'
    } else {
      domColor = 'text-red-700'
      domBg = 'bg-red-100'
    }

    return `
      <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
        <div class="flex items-center space-x-3 flex-1">
          <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : index === 2 ? 'bg-orange-300' : 'bg-gray-200'} text-white font-bold text-sm">
            ${index + 1}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900 text-sm sm:text-base">${capitalize(model.brand)} ${capitalize(model.model)}</div>
            <div class="text-xs text-gray-500">${model.salesCount} ${tr('sales', 'ventes')} • ${formatCurrency(model.medianPrice || 0, 'EUR')}</div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${domBg} ${domColor}">
            ⚡ ${model.averageDOM}j
          </span>
        </div>
      </div>
    `
  }).join('') + `
    <div class="mt-4 text-center">
      <a href="#/market-insights" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
        ${tr('View all models →', 'Voir tous les modèles →')}
      </a>
    </div>
  `
}

function renderAlerts(alerts) {
  const container = document.getElementById('alerts-list')
  
  if (alerts.length === 0) {
    return // Keep default empty state
  }

  container.innerHTML = alerts.map(alert => {
    const criteria = alert.criteria || {}
    const brand = criteria.brand ? (Array.isArray(criteria.brand) ? criteria.brand.join(', ') : criteria.brand) : tr('All brands', 'Toutes marques')
    const statusBadge = alert.status === 'active' 
      ? `<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">${tr('Active', 'Active')}</span>`
      : `<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">${tr('Inactive', 'Inactive')}</span>`
    const locale = getLang() === 'fr' ? 'fr-FR' : 'en-US'
    const date = new Date(alert.created_at).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short'
    })

    return `
      <div class="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
          <div class="flex items-center space-x-2 sm:space-x-3 flex-wrap">
            <h3 class="font-semibold text-gray-900 text-sm sm:text-base">${alert.name}</h3>
            ${statusBadge}
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-xs sm:text-sm text-gray-500">${alert.events_count || 0} ${tr('events', 'événements')}</span>
            <button class="text-red-600 hover:text-red-700 text-xs sm:text-sm">${tr('Delete', 'Supprimer')}</button>
          </div>
        </div>
        <div class="text-xs sm:text-sm text-gray-600">
          ${brand} • ${tr('Created on', 'Créée le')} ${date}
        </div>
      </div>
    `
  }).join('')
}

