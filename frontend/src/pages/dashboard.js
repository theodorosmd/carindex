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
      <nav class="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div class="flex items-center justify-between gap-4">
          <a href="#/" class="flex items-center space-x-2 shrink-0">
            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg sm:text-xl">C</span>
            </div>
            <span class="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Carindex</span>
          </a>
          <!-- Desktop Navigation -->
          <div class="hidden xl:flex items-center gap-x-6 lg:gap-x-8 flex-1 justify-end">
            <a href="#/search" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Search', 'Rechercher')}</a>
            <a href="#/market-insights" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Market Insights', 'Market Insights')}</a>
            <a href="#/arbitrage" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Arbitrage', 'Arbitrage')}</a>
            <a href="#/auction-margin" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Margin Calculator', 'Calculateur de Marge')}</a>
            <a href="#/evaluations" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('My Evaluations', 'Mes Évaluations')}</a>
            <span class="text-gray-500 text-sm whitespace-nowrap py-2 max-w-[140px] truncate" title="${user.email}">${user.email}</span>
            <span class="w-px h-5 bg-gray-200" aria-hidden="true"></span>
            ${renderLanguageToggle()}
            <button onclick="window.logout()" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2 pl-2">${tr('Logout', 'Déconnexion')}</button>
          </div>
          <!-- Tablet/Mobile Menu Button -->
          <div class="xl:hidden flex items-center gap-3 shrink-0">
            <span class="text-gray-500 text-sm truncate max-w-[100px] sm:max-w-[140px]" title="${user.email}">${user.email}</span>
            <button id="dashboard-mobile-menu-btn" class="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            ${renderLanguageToggle()}
            <button onclick="window.logout()" class="text-gray-600 hover:text-blue-600 transition text-sm py-2">${tr('Logout', 'Déconnexion')}</button>
          </div>
        </div>
        <!-- Mobile/Tablet Menu -->
        <div id="dashboard-mobile-menu" class="hidden xl:hidden mt-4 pt-4 border-t border-gray-200 pb-4">
          <div class="flex flex-col gap-2">
            <a href="#/search" class="py-2.5 text-gray-600 hover:text-blue-600 transition">${tr('Search', 'Rechercher')}</a>
            <a href="#/market-insights" class="py-2.5 text-gray-600 hover:text-blue-600 transition">${tr('Market Insights', 'Market Insights')}</a>
            <a href="#/arbitrage" class="py-2.5 text-gray-600 hover:text-blue-600 transition">${tr('Arbitrage', 'Arbitrage')}</a>
            <a href="#/auction-margin" class="py-2.5 text-gray-600 hover:text-blue-600 transition">${tr('Margin Calculator', 'Calculateur de Marge')}</a>
            <a href="#/evaluations" class="py-2.5 text-gray-600 hover:text-blue-600 transition">${tr('My Evaluations', 'Mes Évaluations')}</a>
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

          <!-- Saved Searches -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900">🔖 ${tr('Saved Searches', 'Recherches sauvegardées')}</h2>
              <button id="create-saved-search-btn" class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                ${tr('+ Save a search', '+ Sauvegarder une recherche')}
              </button>
            </div>

            <!-- Inline create form (hidden by default) -->
            <div id="saved-search-form" class="hidden mb-5 p-4 border border-blue-200 bg-blue-50 rounded-xl">
              <h3 class="text-sm font-semibold text-blue-900 mb-3">${tr('New saved search', 'Nouvelle recherche sauvegardée')}</h3>
              <div class="flex flex-col sm:flex-row gap-3 mb-3">
                <input id="ss-name" type="text" placeholder="${tr('Name (e.g. VW Golf FR under 15k)', 'Nom (ex. VW Golf FR sous 15k)')}"
                  class="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" maxlength="200" />
              </div>
              <div class="flex items-center gap-3 mb-4">
                <label class="flex items-center gap-2 cursor-pointer text-sm text-blue-800">
                  <input id="ss-alert-email" type="checkbox" class="w-4 h-4 accent-blue-600" />
                  ${tr('Notify me by email when new listings match', 'Me notifier par email pour les nouvelles annonces')}
                </label>
              </div>
              <div id="ss-filters-preview" class="text-xs text-blue-700 mb-3 italic"></div>
              <div class="flex gap-2">
                <button id="ss-save-btn" class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">
                  ${tr('Save', 'Enregistrer')}
                </button>
                <button id="ss-cancel-btn" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition">
                  ${tr('Cancel', 'Annuler')}
                </button>
              </div>
              <p id="ss-error" class="text-xs text-red-600 mt-2 hidden"></p>
            </div>

            <div id="saved-searches-list" class="space-y-3">
              <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
                <p class="text-sm">${tr('No saved searches yet', 'Aucune recherche sauvegardée')}</p>
                <p class="text-xs text-gray-400 mt-1">${tr('Save searches to re-run them anytime and get email alerts.', 'Sauvegardez des recherches pour les relancer et recevoir des alertes.')}</p>
              </div>
            </div>
          </div>

          <!-- Fastest Selling Models Widget -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900">⚡ ${tr('Fastest-selling models', 'Modèles qui se Vendent le Plus Vite')}</h2>
              <div class="flex flex-wrap items-center gap-2">
                <select id="fastest-models-country" onchange="loadFastestModelsWidget()" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">${tr('All countries', 'Tous pays')}</option>
                  <option value="FR">France</option>
                  <option value="DE">Allemagne</option>
                  <option value="SE">Suède</option>
                  <option value="NO">Norvège</option>
                  <option value="FI">Finlande</option>
                  <option value="DK">Danemark</option>
                  <option value="NL">Pays-Bas</option>
                  <option value="BE">Belgique</option>
                  <option value="ES">Espagne</option>
                  <option value="IT">Italie</option>
                  <option value="CH">Suisse</option>
                  <option value="PL">Pologne</option>
                </select>
                <select id="fastest-models-period" onchange="loadFastestModelsWidget()" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="30">${tr('1 month', '1 mois')}</option>
                  <option value="90">${tr('3 months', '3 mois')}</option>
                  <option value="180">${tr('6 months', '6 mois')}</option>
                  <option value="365">${tr('1 year', '1 an')}</option>
                </select>
                <a href="#/market-insights" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  ${tr('View all insights →', 'Voir tous les insights →')}
                </a>
              </div>
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

  // Saved search form toggle
  document.getElementById('create-saved-search-btn')?.addEventListener('click', () => {
    const form = document.getElementById('saved-search-form')
    if (form) {
      form.classList.toggle('hidden')
      if (!form.classList.contains('hidden')) {
        // Show a preview of any active filters if available
        const preview = document.getElementById('ss-filters-preview')
        if (preview) {
          const filterDesc = buildFilterDesc(null)
          preview.textContent = filterDesc
            ? `${tr('Filters:', 'Filtres:')} ${filterDesc}`
            : tr('No active filters. Enter a name for this saved search.', 'Aucun filtre actif. Entrez un nom pour cette recherche.')
        }
        document.getElementById('ss-name')?.focus()
      }
    }
  })

  document.getElementById('ss-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('saved-search-form')?.classList.add('hidden')
    document.getElementById('ss-error')?.classList.add('hidden')
  })

  document.getElementById('ss-save-btn')?.addEventListener('click', createSavedSearch)

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('dashboard-mobile-menu-btn')
  const mobileMenu = document.getElementById('dashboard-mobile-menu')
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden')
    })
  }
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
    const searchesProgressEl = document.getElementById('searches-progress')
    searchesProgressEl.style.width = searchesProgress + '%'
    if (searchesProgress >= 90) {
      searchesProgressEl.classList.replace('bg-blue-600', 'bg-red-500')
    } else if (searchesProgress >= 70) {
      searchesProgressEl.classList.replace('bg-blue-600', 'bg-orange-400')
    }

    document.getElementById('alerts-count').textContent = stats.alerts.count
    document.getElementById('alerts-limit').textContent = 
      stats.alerts.limit === -1 ? tr('Unlimited', 'Illimité') : `${tr('Limit:', 'Limite:')} ${stats.alerts.limit}`
    
    const alertsProgress = stats.alerts.limit === -1 ? 0 : 
      Math.min(100, (stats.alerts.count / stats.alerts.limit) * 100)
    const alertsProgressEl = document.getElementById('alerts-progress')
    alertsProgressEl.style.width = alertsProgress + '%'
    if (alertsProgress >= 90) {
      alertsProgressEl.classList.replace('bg-green-600', 'bg-red-500')
    } else if (alertsProgress >= 70) {
      alertsProgressEl.classList.replace('bg-green-600', 'bg-orange-400')
    }

    const planNames = {
      starter: 'Starter',
      pro: 'Pro',
      dealer: 'Dealer',
      plus: 'Dealer', // legacy alias
    }
    const planEl = document.getElementById('plan-name')
    if (planEl) {
      const planLabel = planNames[stats.plan] || stats.plan
      const planColor = stats.plan === 'pro' ? 'text-blue-600' : stats.plan === 'dealer' || stats.plan === 'plus' ? 'text-purple-600' : 'text-gray-900'
      planEl.innerHTML = `<span class="${planColor}">${planLabel}</span>`
    }

    // Add upgrade CTA inside plan card for starter users
    if (stats.plan === 'starter') {
      const planCard = document.getElementById('plan-name')?.closest('.bg-white')
      if (planCard && !planCard.querySelector('#plan-upgrade-cta')) {
        planCard.insertAdjacentHTML('beforeend', `
          <div id="plan-upgrade-cta" class="mt-4 pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-500 mb-3">${tr('Unlock unlimited searches, full price history & depreciation data.', 'Débloquez les recherches illimitées, l\'historique des prix et les données de dépréciation.')}</p>
            <a href="/pricing" class="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              🚀 ${tr('Upgrade to Pro', 'Passer à Pro')}
            </a>
          </div>
        `)
      }
    }

    // Show upgrade banner if any limit is reached (starter plan only)
    const searchesAtLimit = stats.searches.limit !== -1 && stats.searches.remaining === 0
    const alertsAtLimit = stats.alerts.limit !== -1 && stats.alerts.remaining === 0
    if (searchesAtLimit || alertsAtLimit) {
      const limitType = searchesAtLimit && alertsAtLimit
        ? tr('searches and alerts', 'recherches et alertes')
        : searchesAtLimit
          ? tr('searches', 'recherches')
          : tr('alerts', 'alertes')
      const bannerHtml = `
        <div id="upgrade-banner" class="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            </svg>
            <div>
              <p class="font-semibold text-amber-900">${tr("You've reached your Starter plan limit", "Vous avez atteint la limite de votre plan Starter")}</p>
              <p class="text-sm text-amber-700 mt-0.5">${tr(`Your monthly ${limitType} quota is used up. Upgrade to Pro for unlimited ${limitType}.`, `Votre quota mensuel de ${limitType} est épuisé. Passez en Pro pour des ${limitType} illimitées.`)}</p>
            </div>
          </div>
          <a href="#/pricing" class="flex-shrink-0 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition text-sm">
            ${tr('Upgrade to Pro', 'Passer en Pro')}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
          </a>
        </div>`
      dashboardContent.insertAdjacentHTML('afterbegin', bannerHtml)
    } else if (searchesProgress >= 80 || alertsProgress >= 80) {
      // Warning banner when nearing limit (>80%)
      const bannerHtml = `
        <div id="upgrade-banner" class="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            </svg>
            <p class="text-sm text-orange-800">
              <span class="font-semibold">${tr("You're nearing your Starter plan limit.", "Vous approchez de la limite de votre plan Starter.")}</span>
              ${tr(' Upgrade to Pro for unlimited access.', ' Passez en Pro pour un accès illimité.')}
            </p>
          </div>
          <a href="#/pricing" class="flex-shrink-0 text-sm font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap">
            ${tr('View plans →', 'Voir les plans →')}
          </a>
        </div>`
      dashboardContent.insertAdjacentHTML('afterbegin', bannerHtml)
    }

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

    // Load saved searches
    loadSavedSearches().catch(() => {})

    // Load fastest selling models widget
    await loadFastestModelsWidget()

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

async function loadFastestModelsWidget() {
  const container = document.getElementById('fastest-models-widget')
  if (!container) return

  const token = getAuthToken()
  if (!token) return

  const daysEl = document.getElementById('fastest-models-period')
  const countryEl = document.getElementById('fastest-models-country')
  const days = daysEl ? parseInt(daysEl.value, 10) || 30 : 30
  const country = countryEl ? countryEl.value || '' : ''

  try {
    container.innerHTML = '<div class="text-center py-4 text-gray-500"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><p class="mt-2 text-sm">' + tr('Loading...', 'Chargement...') + '</p></div>'
    const params = new URLSearchParams({ limit: '5', days: days.toString() })
    if (country) params.append('country', country)
    const response = await fetch(`/api/v1/analytics/fastest-selling-models?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      let models = data.models || []
      models = [...models].sort((a, b) => {
        const velA = Number(a.velocityPerMonth) ?? 0
        const velB = Number(b.velocityPerMonth) ?? 0
        if (velB !== velA) return velB - velA
        return (b.salesCount ?? 0) - (a.salesCount ?? 0)
      })
      renderFastestModelsWidget(models)
    } else {
      renderFastestModelsWidget([])
    }
  } catch (error) {
    console.error('Error loading fastest models:', error)
    renderFastestModelsWidget([])
  }
}

window.loadFastestModelsWidget = loadFastestModelsWidget

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
            <div class="font-semibold text-gray-900 text-sm sm:text-base">${capitalize(model.brand)} ${capitalize(model.model)}${model.year && model.year !== 2000 ? ' ' + model.year : ''}</div>
            ${model.variant ? `<div class="text-xs text-gray-600">${model.variant}</div>` : ''}
            <div class="text-xs text-gray-500">${model.salesCount} ${tr('sales', 'ventes')} • ${formatCurrency(model.medianPrice || 0, 'EUR')}</div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${domBg} ${domColor}" title="${model.averageDOM === 0 ? (tr('Same-day sale or listing tracked for less than 1 day', 'Vente le jour même ou annonce suivie moins d\'1 jour')) : ''}">
            ⚡ ${model.averageDOM === 0 ? '< 1j' : model.averageDOM + 'j'}
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

// ─── Saved Searches ────────────────────────────────────────────────────────────

async function loadSavedSearches() {
  const token = getAuthToken()
  if (!token) return

  try {
    const res = await fetch('/api/v1/saved-searches', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return
    const data = await res.json()
    renderSavedSearches(data || [])
  } catch (e) {
    console.warn('Could not load saved searches:', e)
  }
}

function buildFilterDesc(filters) {
  if (!filters || Object.keys(filters).length === 0) return ''
  const parts = []
  if (filters.brand?.length) parts.push(Array.isArray(filters.brand) ? filters.brand.join(', ') : filters.brand)
  if (filters.model?.length) parts.push(Array.isArray(filters.model) ? filters.model.join(', ') : filters.model)
  if (filters.min_year || filters.max_year) {
    const y = [filters.min_year, filters.max_year].filter(Boolean).join('–')
    parts.push(y)
  }
  if (filters.min_price || filters.max_price) {
    const p = [filters.min_price ? `€${Number(filters.min_price).toLocaleString()}` : null, filters.max_price ? `€${Number(filters.max_price).toLocaleString()}` : null].filter(Boolean).join('–')
    parts.push(p)
  }
  if (filters.country) parts.push(filters.country)
  if (filters.fuel?.length) parts.push(Array.isArray(filters.fuel) ? filters.fuel.join('/') : filters.fuel)
  return parts.join(' · ')
}

function renderSavedSearches(searches) {
  const container = document.getElementById('saved-searches-list')
  if (!container) return

  if (searches.length === 0) {
    return // Keep default empty state
  }

  const locale = getLang() === 'fr' ? 'fr-FR' : 'en-US'

  container.innerHTML = searches.map(ss => {
    const filterDesc = buildFilterDesc(ss.filters)
    const date = new Date(ss.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    const newBadge = ss.new_count > 0
      ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">${ss.new_count} ${tr('new', 'nouvelles')}</span>`
      : ''
    const alertBadge = ss.alert_email
      ? `<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">📧 ${tr('Email alert', 'Alerte email')}</span>`
      : ''

    // Build the search URL from filters
    const params = new URLSearchParams()
    const f = ss.filters || {}
    if (f.brand) (Array.isArray(f.brand) ? f.brand : [f.brand]).forEach(b => params.append('brand', b))
    if (f.model) (Array.isArray(f.model) ? f.model : [f.model]).forEach(m => params.append('model', m))
    if (f.min_price) params.set('min_price', f.min_price)
    if (f.max_price) params.set('max_price', f.max_price)
    if (f.min_year)  params.set('min_year', f.min_year)
    if (f.max_year)  params.set('max_year', f.max_year)
    if (f.country)   params.set('country', f.country)
    if (f.fuel)      (Array.isArray(f.fuel) ? f.fuel : [f.fuel]).forEach(v => params.append('fuel', v))
    const searchHref = `/search?${params.toString()}`

    return `
      <div class="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 transition" data-ss-id="${ss.id}">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-gray-900 text-sm">${ss.name}</span>
              ${newBadge}
              ${alertBadge}
            </div>
            ${filterDesc ? `<p class="text-xs text-gray-500 mt-1">${filterDesc}</p>` : ''}
            <p class="text-xs text-gray-400 mt-1">${tr('Saved on', 'Sauvegardée le')} ${date}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a href="${searchHref}" class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
              ${tr('Open', 'Ouvrir')} →
            </a>
            <button class="ss-toggle-alert text-xs px-2.5 py-1.5 border rounded-lg transition ${ss.alert_email ? 'border-green-300 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600' : 'border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700'}"
              data-id="${ss.id}" data-alert="${ss.alert_email ? '1' : '0'}" title="${ss.alert_email ? tr('Disable email alert', 'Désactiver l\'alerte email') : tr('Enable email alert', 'Activer l\'alerte email')}">
              ${ss.alert_email ? '🔔' : '🔕'}
            </button>
            <button class="ss-delete text-xs px-2.5 py-1.5 border border-gray-200 text-gray-400 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
              data-id="${ss.id}" title="${tr('Delete', 'Supprimer')}">
              ✕
            </button>
          </div>
        </div>
      </div>
    `
  }).join('')

  // Bind delete buttons
  container.querySelectorAll('.ss-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      if (!confirm(tr('Delete this saved search?', 'Supprimer cette recherche sauvegardée\u00a0?'))) return
      const token = getAuthToken()
      try {
        const res = await fetch(`/api/v1/saved-searches/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok || res.status === 204) {
          btn.closest('[data-ss-id]')?.remove()
          // If list is now empty, restore placeholder
          if (!container.querySelector('[data-ss-id]')) {
            container.innerHTML = `
              <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
                <p class="text-sm">${tr('No saved searches yet', 'Aucune recherche sauvegardée')}</p>
              </div>`
          }
        }
      } catch (e) { console.warn('Delete error', e) }
    })
  })

  // Bind alert toggle buttons
  container.querySelectorAll('.ss-toggle-alert').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      const currentAlert = btn.dataset.alert === '1'
      const newAlert = !currentAlert
      const token = getAuthToken()
      try {
        const res = await fetch(`/api/v1/saved-searches/${id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert_email: newAlert })
        })
        if (res.ok) {
          // Update the button appearance in-place
          btn.dataset.alert = newAlert ? '1' : '0'
          btn.textContent = newAlert ? '🔔' : '🔕'
          btn.className = `ss-toggle-alert text-xs px-2.5 py-1.5 border rounded-lg transition ${newAlert ? 'border-green-300 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600' : 'border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700'}`
          // Update the badge
          const card = btn.closest('[data-ss-id]')
          const badgeEl = card?.querySelector('.ss-alert-badge')
          if (card) {
            // Re-render just the name/badge area would be complex; reload the section
            loadSavedSearches()
          }
        }
      } catch (e) { console.warn('Toggle alert error', e) }
    })
  })
}

async function createSavedSearch() {
  const name = document.getElementById('ss-name')?.value?.trim()
  const alertEmail = document.getElementById('ss-alert-email')?.checked || false
  const errorEl = document.getElementById('ss-error')

  if (!name) {
    if (errorEl) { errorEl.textContent = tr('Please enter a name.', 'Veuillez entrer un nom.'); errorEl.classList.remove('hidden') }
    return
  }

  const token = getAuthToken()
  const btn = document.getElementById('ss-save-btn')
  if (btn) { btn.disabled = true; btn.textContent = tr('Saving…', 'Enregistrement…') }

  try {
    const res = await fetch('/api/v1/saved-searches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, filters: {}, alert_email: alertEmail })
    })

    if (res.status === 429) {
      const data = await res.json()
      if (errorEl) { errorEl.textContent = data.error || tr('Limit reached.', 'Limite atteinte.'); errorEl.classList.remove('hidden') }
      return
    }

    if (!res.ok) throw new Error(await res.text())

    // Reset form and reload
    document.getElementById('saved-search-form')?.classList.add('hidden')
    if (document.getElementById('ss-name')) document.getElementById('ss-name').value = ''
    if (document.getElementById('ss-alert-email')) document.getElementById('ss-alert-email').checked = false
    errorEl?.classList.add('hidden')
    await loadSavedSearches()
  } catch (e) {
    if (errorEl) { errorEl.textContent = e.message || tr('Error saving search.', 'Erreur lors de la sauvegarde.'); errorEl.classList.remove('hidden') }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = tr('Save', 'Enregistrer') }
  }
}

