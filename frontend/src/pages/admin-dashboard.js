import { getAuthToken, getUser, isAdmin } from '../main.js'
import { tr, renderLanguageToggle, attachLanguageToggle, capitalize } from '../utils/i18n.js'

export async function renderAdminDashboard() {
  const app = document.getElementById('app')
  if (!app) {
    console.error('Admin: #app element not found')
    document.body.innerHTML = '<div class="p-8 text-center"><h1 class="text-xl text-red-600">Error: App container not found</h1><a href="/">Go home</a></div>'
    return
  }

  const showError = (msg) => {
    app.innerHTML = `<div class="min-h-screen bg-gray-50 flex items-center justify-center p-8"><div class="max-w-md text-center"><h1 class="text-xl font-bold text-red-600 mb-4">Error</h1><p class="text-gray-600 mb-4">${msg}</p><a href="/" class="text-blue-600 hover:underline">Back to home</a><br><a href="#/login" class="text-blue-600 hover:underline mt-2 inline-block">Login</a></div></div>`
  }

  const user = getUser()
  
  if (!user) {
    window.location.hash = '#/login?redirect=' + encodeURIComponent(window.location.pathname || '/admin')
    return
  }
  
  // Verify admin role by fetching fresh user data
  try {
    const token = getAuthToken()
    if (token) {
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        console.warn('⚠️ Token expired - redirecting to login')
        localStorage.removeItem('carindex_token')
        localStorage.removeItem('carindex_user')
        window.location.hash = '#/login?redirect=/admin'
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        const freshUser = data.user
        
        // Update localStorage with fresh user data
        if (freshUser) {
          localStorage.setItem('carindex_user', JSON.stringify(freshUser))
          
          // Redirect if not admin
          if (freshUser.role !== 'admin') {
            window.location.hash = '#/dashboard'
            return
          }
        } else {
          window.location.hash = '#/dashboard'
          return
        }
      } else if (response.status === 401) {
        // Token expired - redirect to login
        console.warn('⚠️ Token expired - redirecting to login')
        localStorage.removeItem('carindex_token')
        localStorage.removeItem('carindex_user')
        window.location.hash = '#/login?redirect=/admin'
        return
      } else if (response.status === 403) {
        // Not admin, redirect to regular dashboard
        window.location.hash = '#/dashboard'
        return
      }
    }
  } catch (error) {
    console.warn('Could not verify admin access:', error)
    // Fall through to check localStorage
  }
  
  // Also check localStorage role
  if (!isAdmin()) {
    window.location.hash = '#/dashboard'
    return
  }

  try {
  app.innerHTML = `
    <!-- Navigation -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <nav class="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center shrink-0">
            <a href="#/" class="flex items-center space-x-2">
              <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg sm:text-xl">C</span>
              </div>
              <span class="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Carindex</span>
            </a>
          </div>
          
          <!-- Desktop Navigation -->
          <div class="hidden xl:flex items-center gap-x-6 lg:gap-x-8 flex-1 justify-end">
            <a href="#/search" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Search', 'Rechercher')}</a>
            <a href="#/dashboard" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Dashboard', 'Dashboard')}</a>
            <a href="#/market-insights" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Market Insights', 'Market Insights')}</a>
            <a href="#/arbitrage" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">Arbitrage</a>
            <a href="#/evaluations" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Evaluations', 'Évaluations')}</a>
            <a href="#/auction-margin" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">${tr('Calculator', 'Calculateur')}</a>
            <a href="/#/admin/blog" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2">Blog</a>
            <span class="px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold whitespace-nowrap">ADMIN</span>
            <span class="w-px h-5 bg-gray-200" aria-hidden="true"></span>
            ${renderLanguageToggle()}
            <button onclick="window.logout()" class="text-gray-600 hover:text-blue-600 transition text-sm lg:text-base whitespace-nowrap py-2 pl-2">${tr('Logout', 'Déconnexion')}</button>
          </div>

          <!-- Tablet/Mobile Menu Button -->
          <div class="xl:hidden flex items-center gap-3 shrink-0">
            <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">ADMIN</span>
            <button id="mobile-menu-button" onclick="toggleMobileMenu()" class="p-2 text-gray-600 hover:text-blue-600 transition">
              <svg id="menu-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
              <svg id="close-icon" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile/Tablet Menu -->
        <div id="mobile-menu" class="hidden xl:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
          <div class="flex flex-col space-y-3 pt-4">
            <a href="#/search" class="text-gray-600 hover:text-blue-600 transition text-base py-2">${tr('Search', 'Rechercher')}</a>
            <a href="#/dashboard" class="text-gray-600 hover:text-blue-600 transition text-base py-2">${tr('Dashboard', 'Dashboard')}</a>
            <a href="#/market-insights" class="text-gray-600 hover:text-blue-600 transition text-base py-2">${tr('Market Insights', 'Market Insights')}</a>
            <a href="#/arbitrage" class="text-gray-600 hover:text-blue-600 transition text-base py-2">Arbitrage</a>
            <a href="#/evaluations" class="text-gray-600 hover:text-blue-600 transition text-base py-2">${tr('Evaluations', 'Évaluations')}</a>
            <a href="#/auction-margin" class="text-gray-600 hover:text-blue-600 transition text-base py-2">${tr('Calculator', 'Calculateur')}</a>
            <a href="/#/admin/blog" class="text-gray-600 hover:text-blue-600 transition text-base py-2">Blog</a>
            <div class="pt-2 border-t border-gray-200">
              <button onclick="window.logout()" class="w-full text-left px-0 py-2 text-gray-600 hover:text-blue-600 transition text-base">${tr('Logout', 'Déconnexion')}</button>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <div class="min-h-screen bg-gray-50 py-4 sm:py-8 overflow-x-hidden">
      <div class="container mx-auto px-3 sm:px-6 max-w-[100vw]">
        <!-- Page Header -->
        <div class="mb-6 sm:mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">${tr('Admin Dashboard', 'Tableau de Bord Admin')}</h1>
          <p class="text-sm sm:text-base text-gray-600">${tr('Carindex platform management', 'Gestion de la plateforme Carindex')}</p>
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

        <!-- Admin Content -->
        <div id="admin-content" class="hidden">
          <!-- Statistics Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <!-- Total Users -->
            <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
              <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg font-semibold text-gray-900">${tr('Users', 'Utilisateurs')}</h3>
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900" id="total-users">-</div>
              <div class="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2" id="recent-users">${tr('New (7d):', 'Nouveaux (7j):')} -</div>
            </div>

            <!-- Total Listings -->
            <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
              <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg font-semibold text-gray-900">${tr('Listings', 'Annonces')}</h3>
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900" id="total-listings">-</div>
              <div class="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2" id="active-listings">${tr('Active:', 'Actives:')} -</div>
              <div class="text-xs text-gray-400 mt-1" id="listings-cache-time"></div>
            </div>

            <!-- Total Alerts -->
            <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
              <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg font-semibold text-gray-900">${tr('Alerts', 'Alertes')}</h3>
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
              </div>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900" id="total-alerts">-</div>
              <div class="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2" id="active-alerts">${tr('Active:', 'Actives:')} -</div>
            </div>

            <!-- Plan Distribution -->
            <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
              <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg font-semibold text-gray-900">${tr('Plans', 'Plans')}</h3>
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div class="text-xs sm:text-sm text-gray-600 space-y-1" id="plan-distribution">
                <div>${tr('Loading...', 'Chargement...')}</div>
              </div>
            </div>
          </div>

          <!-- Scraper Dashboard -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-6 mb-6 sm:mb-8 overflow-hidden">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 gap-3">
              <h2 class="text-base sm:text-xl font-bold text-gray-900">${tr('Scrapers & Crons Dashboard', 'Tableau de Bord Scrapers & Crons')}</h2>
              <div class="flex flex-row items-center gap-2">
                <span id="scraper-dashboard-last-update" class="text-xs text-gray-500 hidden sm:inline">${tr('Auto refresh (30s)', 'Actualisation auto (30s)')}</span>
                <button onclick="loadScraperDashboard()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium whitespace-nowrap">
                  🔄 ${tr('Refresh', 'Actualiser')}
                </button>
              </div>
            </div>
            <p class="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">${tr('Overview of runs, crons, and statuses (OK / pending / error) per site', 'Vue d\'ensemble des runs, crons et statuts (OK / en attente / erreur) par site')}</p>
            <div id="scraper-dashboard-content" class="space-y-6">
              <div class="text-center py-8 text-gray-500">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2">${tr('Loading...', 'Chargement...')}</p>
              </div>
            </div>
          </div>

          <!-- Plan Usage Monitoring -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <div>
                <h2 class="text-lg sm:text-xl font-bold text-gray-900">${tr('Plan Usage', 'Utilisation des Plans')}</h2>
                <p class="text-sm text-gray-500 mt-0.5">${tr('Users at ≥80% of their plan quota this month', 'Utilisateurs à ≥80% de leur quota ce mois')}</p>
              </div>
              <button onclick="loadUsageMonitoring()" class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap">
                ${tr('Refresh', 'Actualiser')}
              </button>
            </div>
            <div id="usage-monitoring-content">
              <div class="text-center py-8 text-gray-500">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2">${tr('Loading...', 'Chargement...')}</p>
              </div>
            </div>
          </div>

          <!-- Users Management -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900">${tr('User Management', 'Gestion des Utilisateurs')}</h2>
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <input type="text" id="user-search" placeholder="${tr('Search for a user...', 'Rechercher un utilisateur...')}" class="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0">
                <button id="refresh-users" class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap">
                  ${tr('Refresh', 'Actualiser')}
                </button>
              </div>
            </div>
            <div class="overflow-x-auto -mx-4 sm:mx-0">
              <div class="inline-block min-w-full align-middle">
                <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Plan', 'Plan')}</th>
                        <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Role', 'Rôle')}</th>
                        <th class="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Signup', 'Inscription')}</th>
                        <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${tr('Actions', 'Actions')}</th>
                      </tr>
                    </thead>
                <tbody id="users-table-body" class="bg-white divide-y divide-gray-200">
                  <tr>
                    <td colspan="5" class="px-3 sm:px-4 py-8 text-center text-gray-500">
                      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p class="mt-2">${tr('Loading...', 'Chargement...')}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
                </div>
              </div>
            </div>
            <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="text-xs sm:text-sm text-gray-600 text-center sm:text-left" id="users-pagination-info">-</div>
              <div class="flex flex-wrap justify-center gap-2" id="users-pagination"></div>
            </div>
          </div>

          <!-- Fastest Selling Models Widget -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900">⚡ ${tr('Fastest Selling Models', 'Modèles qui se Vendent le Plus Vite')}</h2>
              <div class="flex flex-wrap items-center gap-2">
                <select id="fastest-models-country" onchange="loadFastestModelsWidget()" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">${tr('All countries', 'Tous les pays')}</option>
                  <option value="FR">${tr('France', 'France')}</option>
                  <option value="DE">${tr('Germany', 'Allemagne')}</option>
                  <option value="SE">${tr('Sweden', 'Suède')}</option>
                  <option value="NO">${tr('Norway', 'Norvège')}</option>
                  <option value="FI">${tr('Finland', 'Finlande')}</option>
                  <option value="DK">${tr('Denmark', 'Danemark')}</option>
                  <option value="NL">${tr('Netherlands', 'Pays-Bas')}</option>
                  <option value="BE">${tr('Belgium', 'Belgique')}</option>
                  <option value="ES">${tr('Spain', 'Espagne')}</option>
                  <option value="IT">${tr('Italy', 'Italie')}</option>
                  <option value="CH">${tr('Switzerland', 'Suisse')}</option>
                  <option value="PL">${tr('Poland', 'Pologne')}</option>
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

          <!-- Source Distribution -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">${tr('Listings by source', 'Annonces par source')}</h2>
            <div id="source-distribution" class="space-y-3">
              <div class="text-center py-8 text-gray-500">${tr('Loading...', 'Chargement...')}</div>
            </div>
          </div>

          <!-- Scraper Control -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">${tr('Scraper Control', 'Contrôle des Scrapers')}</h2>
            <p class="text-sm text-gray-600 mb-6">${tr('Manually trigger scraping to update data', 'Déclencher manuellement les scrapers pour mettre à jour les données')}</p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <!-- AutoScout24 -->
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900">AutoScout24</h3>
                  <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">${tr('Germany', 'Allemagne')}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3">${tr('Scrapes listings from AutoScout24', 'Scrape les annonces depuis AutoScout24')}</p>
                <div class="space-y-2">
                  <input type="url" id="autoscout-url" placeholder="${tr('AutoScout24 search URL', 'URL de recherche AutoScout24')}"
                         class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <button onclick="triggerScraper('autoscout24', 'autoscout-url')"
                          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                    ${tr('Run scraper', 'Lancer le scraper')}
                  </button>
                </div>
                <div id="autoscout-status" class="mt-3 text-xs"></div>
              </div>

              <!-- mobile.de -->
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900">mobile.de</h3>
                  <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">${tr('Germany', 'Allemagne')}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3">${tr('Scrapes listings from mobile.de', 'Scrape les annonces depuis mobile.de')}</p>
                <div class="space-y-2">
                  <input type="url" id="mobilede-url" placeholder="${tr('mobile.de search URL', 'URL de recherche mobile.de')}"
                         class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <button onclick="triggerScraper('mobile.de', 'mobilede-url')"
                          class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium">
                    ${tr('Run scraper', 'Lancer le scraper')}
                  </button>
                </div>
                <div id="mobilede-status" class="mt-3 text-xs"></div>
              </div>

              <!-- LeBonCoin -->
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900">LeBonCoin</h3>
                  <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">${tr('France', 'France')}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3">${tr('Scrapes listings from LeBonCoin', 'Scrape les annonces depuis LeBonCoin')}</p>
                <div class="space-y-2">
                  <input type="url" id="leboncoin-url" placeholder="${tr('LeBonCoin search URL', 'URL de recherche LeBonCoin')}"
                         class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <button onclick="triggerScraper('leboncoin', 'leboncoin-url')"
                          class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium">
                    ${tr('Run scraper', 'Lancer le scraper')}
                  </button>
                </div>
                <div id="leboncoin-status" class="mt-3 text-xs"></div>
              </div>

              <!-- L'Argus -->
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900">L'Argus</h3>
                  <span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">${tr('France', 'France')}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3">${tr('Scrapes listings from occasion.largus.fr', 'Scrape les annonces depuis occasion.largus.fr')}</p>
                <div class="space-y-2">
                  <input type="url" id="largus-url" placeholder="https://occasion.largus.fr/auto/"
                         value="https://occasion.largus.fr/auto/"
                         class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <button onclick="triggerScraper('largus', 'largus-url')"
                          class="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium">
                    ${tr('Run scraper', 'Lancer le scraper')}
                  </button>
                </div>
                <div id="largus-status" class="mt-3 text-xs"></div>
              </div>

              <!-- Gaspedaal.nl -->
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900">Gaspedaal.nl</h3>
                  <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">${tr('Netherlands', 'Pays-Bas')}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3">${tr('Scrapes listings from gaspedaal.nl', 'Scrape les annonces depuis gaspedaal.nl')}</p>
                <div class="space-y-2">
                  <input type="url" id="gaspedaal-url" placeholder="https://www.gaspedaal.nl/zoeken?srt=df-a"
                         value="https://www.gaspedaal.nl/zoeken?srt=df-a"
                         class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                  <button onclick="triggerScraper('gaspedaal', 'gaspedaal-url')"
                          class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
                    ${tr('Run scraper', 'Lancer le scraper')}
                  </button>
                </div>
                <div id="gaspedaal-status" class="mt-3 text-xs"></div>
              </div>

              <!-- Marktplaats.nl -->
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900">Marktplaats.nl</h3>
                  <span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">${tr('Netherlands', 'Pays-Bas')}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3">${tr('Scrapes car listings from marktplaats.nl', 'Scrape les annonces auto depuis marktplaats.nl')}</p>
                <div class="space-y-2">
                  <input type="url" id="marktplaats-url" placeholder="https://www.marktplaats.nl/l/auto-s/#f:10882"
                         value="https://www.marktplaats.nl/l/auto-s/#f:10882"
                         class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <button onclick="triggerScraper('marktplaats', 'marktplaats-url')"
                          class="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium">
                    ${tr('Run scraper', 'Lancer le scraper')}
                  </button>
                </div>
                <div id="marktplaats-status" class="mt-3 text-xs"></div>
              </div>
            </div>

            <!-- Scraping History -->
            <div class="mt-6 border-t border-gray-200 pt-6">
              <h3 class="font-semibold text-gray-900 mb-4">${tr('Scraping history', 'Historique des scrapings')}</h3>
              <div id="scraping-history" class="space-y-2 max-h-64 overflow-y-auto">
                <div class="text-sm text-gray-500 text-center py-4">${tr('No recent scraping', 'Aucun scraping récent')}</div>
              </div>
            </div>
          </div>

          <!-- Auto Scrapers Management -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mt-6 sm:mt-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <div>
                <h2 class="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  Scrapings automatiques
                  <span id="running-scrapers-count" class="hidden px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold animate-pulse">
                    <span id="running-count-number">0</span> running
                  </span>
                </h2>
                <p class="text-sm text-gray-600 mt-1">Configurez les scrapings qui s'exécutent automatiquement selon un planning</p>
              </div>
              <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <button onclick="loadAutoScrapers()" class="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium whitespace-nowrap">
                  🔄 Refresh
                </button>
                <button onclick="showCreateAutoScraperModal()" class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap">
                  + New automatic scraping
                </button>
              </div>
            </div>

            <div id="auto-scrapers-list" class="space-y-4">
              <div class="text-center py-8 text-gray-500">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2">Loading...</p>
              </div>
            </div>
          </div>

          <!-- Scraper Runs -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mt-6 sm:mt-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <div>
                <h2 class="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  Historique des runs
                </h2>
                <p class="text-sm text-gray-600 mt-1">Suivi des exécutions de scrapers</p>
              </div>
              <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <button onclick="loadScraperRuns()" class="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium whitespace-nowrap">
                  🔄 Refresh
                </button>
                <button onclick="exportScraperRunsCsv()" class="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium whitespace-nowrap">
                  📥 Export CSV
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <input type="date" id="runs-started-from" class="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-0" />
              <input type="date" id="runs-started-to" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select id="runs-status" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All statuses</option>
                <option value="running">Running</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
              <input type="text" id="runs-source" placeholder="Source (ex: blocket)" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>

            <div class="flex justify-end mb-4">
              <button onclick="loadScraperRuns()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                Filtrer
              </button>
            </div>

            <div id="scraper-runs-list" class="space-y-2">
              <div class="text-center py-8 text-gray-500">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2">Loading...</p>
              </div>
            </div>
          </div>

          <!-- Listings Export -->
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mt-6 sm:mt-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <div>
                <h2 class="text-lg sm:text-xl font-bold text-gray-900">Export listings (filters)</h2>
                <p class="text-sm text-gray-600 mt-1">Export listings according to your criteria</p>
              </div>
              <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <button onclick="exportListingsCsv()" class="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium whitespace-nowrap">
                  📥 Export CSV
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <input type="text" id="export-listings-source" placeholder="Source (ex: autoscout24)" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select id="export-listings-status" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="inactive">Inactive</option>
              </select>
              <select id="export-listings-country" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All countries</option>
                <option value="FR">France</option>
                <option value="SE">Sweden</option>
              </select>
              <input type="text" id="export-listings-brand" placeholder="Brand" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <input type="text" id="export-listings-model" placeholder="Model" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="number" id="export-listings-min-price" placeholder="Min price" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="number" id="export-listings-max-price" placeholder="Max price" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="number" id="export-listings-min-year" placeholder="Min year" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input type="number" id="export-listings-max-year" placeholder="Max year" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="date" id="export-listings-posted-from" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="date" id="export-listings-posted-to" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="number" id="export-listings-limit" placeholder="Limit (e.g. 5000)" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <p class="text-xs text-gray-500 mt-3">Default limit: 5000 (max 20000).</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Auto Scraper Modal -->
    <div id="auto-scraper-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div class="bg-white rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900" id="modal-title">New automatic scraping</h3>
          <button onclick="closeAutoScraperModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <form id="auto-scraper-form" class="space-y-4">
            <input type="hidden" id="scraper-id">
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input type="text" id="scraper-name" required
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="Ex: AutoScout24 - Used cars">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <select id="scraper-source" required
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a source</option>
                <optgroup label="🇫🇷 France">
                  <option value="autoscout24">AutoScout24</option>
                  <option value="mobile.de">mobile.de</option>
                  <option value="leboncoin">LeBonCoin</option>
                  <option value="largus">L'Argus (occasion.largus.fr)</option>
                </optgroup>
                <optgroup label="🇧🇪 Belgium">
                  <option value="2ememain">2ememain.be</option>
                </optgroup>
                <optgroup label="🇳🇱 Netherlands">
                  <option value="gaspedaal">Gaspedaal.nl</option>
                  <option value="marktplaats">Marktplaats.nl</option>
                </optgroup>
                <optgroup label="🇸🇪 Sweden / 🇳🇴 Norway">
                  <option value="blocket">Blocket.se</option>
                  <option value="bilweb">Bilweb.se</option>
                  <option value="bytbil">Bytbil.com</option>
                  <option value="finn">FINN.no</option>
                </optgroup>
                <optgroup label="🇵🇱 Poland">
                  <option value="otomoto">OtoMoto.pl</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Search URL(s)
                <span class="text-xs font-normal text-gray-500">(one per line)</span>
              </label>
              <textarea id="scraper-urls" required rows="3"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://www.autoscout24.fr/lst?sort=standard&desc=0"></textarea>
              <div class="text-xs text-gray-500 mt-2 space-y-2">
                <div class="bg-green-50 border border-green-200 rounded p-2">
                  <p class="font-semibold text-green-900 mb-1">✅ Automatic incremental scraping</p>
                  <p class="text-green-800">The scraper <strong>automatically goes through all pages</strong> of the search!</p>
                  <p class="text-green-700 mt-1">You only need <strong>one search URL</strong> - the scraper will do the rest.</p>
                </div>
                <div>
                  <p class="font-semibold text-gray-700 mb-1">💡 You can also add multiple URLs:</p>
                  <ul class="list-disc list-inside ml-2 space-y-0.5">
                    <li><strong>One URL</strong>: Scrapes all pages of that search automatically</li>
                    <li><strong>Multiple URLs</strong>: Scrapes all pages of each search</li>
                  </ul>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded p-2">
                  <p class="font-semibold text-blue-900 mb-1">Example:</p>
                  <div class="bg-white p-2 rounded text-xs font-mono text-gray-700">
                    https://www.autoscout24.fr/lst?make=BMW
                  </div>
                  <p class="mt-1 text-blue-800">→ The scraper will <strong>automatically go through all pages</strong> of this search (up to the configured limit)</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Max listings per URL
                </label>
                <div class="space-y-2">
                  <div class="flex items-center space-x-2">
                    <input type="checkbox" id="scraper-unlimited" 
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                           onchange="toggleMaxResults()">
                    <label for="scraper-unlimited" class="text-sm text-gray-700">No limit (scrape all listings)</label>
                  </div>
                  <input type="number" id="scraper-max-results" min="1" value="1000"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="1000">
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  <span id="max-results-help">💡 <strong class="text-blue-600">Incremental scraping recommended:</strong> Limit to 500-1000 listings to scrape only new listings (90% cost reduction). Use "No limit" only for a full weekly scrape.</span>
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Limit per thread
                  <span class="text-xs font-normal text-gray-500">(optional)</span>
                </label>
                <input type="number" id="scraper-limit-per-thread" min="1" max="500" value="100"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="100">
                <p class="text-xs text-gray-500 mt-1">Number of listings per scraping thread (default: 100)</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Schedule (Cron format)</label>
              <div class="space-y-2">
                <input type="text" id="scraper-cron" required
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                       placeholder="0 */6 * * * (every 6 hours)">
                <div class="text-xs text-gray-500 space-y-1">
                  <p><strong>Format:</strong> minute hour day month day-of-week</p>
                  <p><strong>Examples:</strong></p>
                  <ul class="list-disc list-inside ml-2 space-y-0.5">
                    <li><code>0 */6 * * *</code> - Every 6 hours</li>
                    <li><code>0 0 * * *</code> - Every day at midnight</li>
                    <li><code>0 0 * * 0</code> - Every Sunday at midnight</li>
                    <li><code>0 0 1 * *</code> - 1st of each month</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="flex items-center">
              <input type="checkbox" id="scraper-enabled" checked
                     class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <label for="scraper-enabled" class="ml-2 text-sm text-gray-700">Enable this automatic scraping</label>
            </div>

            <div class="flex space-x-3 pt-4">
              <button type="submit" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                Save
              </button>
              <button type="button" onclick="closeAutoScraperModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  attachLanguageToggle(() => window.location.reload())
  // Load admin data
  loadAdminData()
  loadUsers()
  loadScraperDashboard()
  loadUsageMonitoring()
  loadAutoScrapers()
  loadScraperRuns()
  
  // Load fastest models widget
  loadFastestModelsWidget()
  
  // Auto-refresh scraper dashboard every 30s to stay in sync with DB
  if (!scraperDashboardRefreshInterval) {
    scraperDashboardRefreshInterval = setInterval(() => loadScraperDashboard(), 30000)
  }

  // Clean up auto-refresh timers when leaving the page
  window.addEventListener('beforeunload', () => {
    if (autoRefreshTimer) {
      clearTimeout(autoRefreshTimer)
      autoRefreshTimer = null
    }
    if (scraperDashboardRefreshInterval) {
      clearInterval(scraperDashboardRefreshInterval)
      scraperDashboardRefreshInterval = null
    }
  })
  } catch (e) {
    console.error('Admin dashboard render error:', e)
    showError(e.message || 'Error loading admin dashboard.')
  }
}

/**
 * Helper function to handle 401 errors - redirects to login
 */
function handle401Error() {
  console.warn('⚠️ Token expired or invalid - redirecting to login')
  localStorage.removeItem('carindex_token')
  localStorage.removeItem('carindex_user')
  window.location.hash = '#/login?redirect=/admin'
  window.location.reload()
}

async function loadAdminData() {
  const loadingState = document.getElementById('loading-state')
  const errorState = document.getElementById('error-state')
  const adminContent = document.getElementById('admin-content')
  const errorMessage = document.getElementById('error-message')
  const token = getAuthToken()

  if (!token) {
    console.error('❌ No token found')
    handle401Error()
    return
  }

  // Check token payload for role
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    console.log('🔍 Token payload:', payload)
    console.log('🔍 Role in token:', payload.role)
    
    if (payload.role !== 'admin') {
      console.warn('⚠️ Token does not have admin role. Please reconnect.')
      loadingState.classList.add('hidden')
      errorState.classList.remove('hidden')
      errorMessage.innerHTML = `
        <div class="space-y-3">
          <p class="font-semibold text-lg">⚠️ Rôle admin non détecté dans votre session</p>
          <p class="text-sm">Votre token JWT contient le rôle <code class="bg-red-100 px-2 py-1 rounded">${payload.role || 'user'}</code> au lieu de <code class="bg-green-100 px-2 py-1 rounded">admin</code>.</p>
          <p class="text-sm">This means you logged in <strong>before</strong> having the admin role in the database.</p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p class="font-semibold text-blue-900 mb-2">✅ Solution :</p>
            <ol class="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Cliquez sur <strong>"Déconnexion"</strong> en haut à droite</li>
              <li>Reconnectez-vous avec votre email</li>
              <li>Un nouveau token avec le rôle admin sera généré</li>
              <li>Rechargez cette page</li>
            </ol>
          </div>
          <button onclick="window.logout()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
            Se déconnecter maintenant
          </button>
        </div>
      `
      return
    }
  } catch (e) {
    console.warn('⚠️ Could not decode token:', e)
  }

  try {
    console.log('📡 Fetching /api/v1/admin/stats...')
    const response = await fetch('/api/v1/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('📊 Admin stats response status:', response.status)

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        handle401Error()
        return
      }
      
      const text = await response.text()
      let errorData = {}
      try {
        errorData = JSON.parse(text)
      } catch {
        // Backend may return HTML (e.g. proxy error when backend not running)
      }
      if (response.status === 500) {
        const details = errorData?.error?.details || errorData?.error?.message
        throw new Error(
          details
            ? `Error 500: ${details}`
            : 'Le serveur a renvoyé une erreur 500. Vérifiez que le backend tourne sur le port 3001 (npm run dev:backend:api) et consultez la console du backend.'
        )
      }
      console.error('❌ Admin stats error:', errorData)
      
      if (response.status === 403) {
        console.warn('⚠️ Access forbidden - redirecting to dashboard')
        window.location.hash = '#/dashboard'
        return
      }
      const msg = errorData.error?.message || errorData.error?.details || errorData.message || `Error ${response.status}`
      throw new Error(msg)
    }

    const data = await response.json()
    console.log('✅ Admin stats data:', data)
    const stats = data.stats

    // Update stats cards (only if elements exist - we might be on a different page)
    const totalUsersEl = document.getElementById('total-users')
    const recentUsersEl = document.getElementById('recent-users')
    const totalListingsEl = document.getElementById('total-listings')
    const activeListingsEl = document.getElementById('active-listings')
    const totalAlertsEl = document.getElementById('total-alerts')
    const activeAlertsEl = document.getElementById('active-alerts')

    if (totalUsersEl) totalUsersEl.textContent = stats.users.total.toLocaleString('en-US')
    if (recentUsersEl) recentUsersEl.textContent = `New (7d): ${stats.users.recent.toLocaleString('en-US')}`
    if (totalListingsEl) totalListingsEl.textContent = stats.listings.total.toLocaleString('en-US')
    if (activeListingsEl) activeListingsEl.textContent = `Active: ${stats.listings.active.toLocaleString('en-US')}`
    const cacheTimeEl = document.getElementById('listings-cache-time')
    if (cacheTimeEl && stats.listings.cache_updated_at) {
      const age = Math.round((Date.now() - new Date(stats.listings.cache_updated_at)) / 60000)
      cacheTimeEl.textContent = age < 2 ? 'Updated just now' : `Updated ${age}m ago`
    }
    if (totalAlertsEl) totalAlertsEl.textContent = stats.alerts.total.toLocaleString('en-US')
    if (activeAlertsEl) activeAlertsEl.textContent = `Active: ${stats.alerts.active.toLocaleString('en-US')}`

    // Plan distribution (only if element exists)
    const planDistribution = document.getElementById('plan-distribution')
    if (planDistribution) {
      const plans = stats.users.by_plan || {}
      planDistribution.innerHTML = Object.entries(plans)
        .map(([plan, count]) => {
          const planNames = { starter: 'Starter', pro: 'Pro', plus: 'Plus' }
          return `<div class="flex justify-between"><span class="capitalize">${planNames[plan] || plan}:</span><span class="font-semibold">${count}</span></div>`
        })
        .join('') || '<div class="text-gray-500">No data</div>'
    }

    // Source distribution (only if element exists)
    const sourceDistribution = document.getElementById('source-distribution')
    if (sourceDistribution) {
      const sources = stats.listings.by_source || {}
      sourceDistribution.innerHTML = Object.entries(sources)
      .map(([source, count]) => {
        const sourceNames = {
          'autoscout24': 'AutoScout24',
          'mobile.de': 'mobile.de',
          'leboncoin': 'LeBonCoin',
          'largus': 'L\'Argus',
          'blocket': 'Blocket.se',
          'bilweb': 'Bilweb.se',
          'bytbil': 'Bytbil.com',
          'finn': 'FINN.no',
          'otomoto': 'OtoMoto.pl',
          'gaspedaal': 'Gaspedaal.nl',
          'marktplaats': 'Marktplaats.nl',
          '2ememain': '2ememain.be'
        }
        const total = stats.listings?.total || 1
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
        return `
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
              <span class="font-medium text-gray-900">${sourceNames[source] || source}</span>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-2 w-full sm:w-auto">
              <div class="w-full sm:w-32 bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
              </div>
              <div class="flex items-center justify-between sm:justify-start sm:space-x-3">
                <span class="text-sm font-semibold text-gray-700 min-w-[80px] sm:w-20 text-right sm:text-left">${count.toLocaleString('en-US')}</span>
                <span class="text-sm text-gray-500 min-w-[44px] sm:w-12 text-right sm:text-left">${percentage}%</span>
              </div>
            </div>
          </div>
        `
      })
      .join('') || '<div class="text-center py-8 text-gray-500">No data</div>'
    }

    // Hide loading, show content (only if elements exist)
    if (loadingState) loadingState.classList.add('hidden')
    if (adminContent) adminContent.classList.remove('hidden')

  } catch (error) {
    console.error('❌ Error loading admin dashboard:', error)
    loadingState.classList.add('hidden')
    errorState.classList.remove('hidden')
    const isNetwork = error.message?.includes('fetch') || error.name === 'TypeError'
    const msg = isNetwork
      ? 'Unable to contact server. Check that the backend is running (npm run dev).'
      : (error.message || 'Une erreur est survenue')
    errorState.innerHTML = `
      <p class="font-semibold">${msg}</p>
      <p class="text-sm mt-2 opacity-90">Vérifiez la console (F12) pour plus de détails.</p>
      <button onclick="window.loadAdminData && window.loadAdminData()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
        Réessayer
      </button>
    `
  }
}

window.loadAdminData = loadAdminData

let currentUsersPage = 1
const usersPerPage = 20

async function loadUsers(page = 1) {
  const token = getAuthToken()
  if (!token) return

  try {
    const response = await fetch(`/api/v1/admin/users?limit=${usersPerPage}&offset=${(page - 1) * usersPerPage}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        handle401Error()
        return
      }
      throw new Error('Error loading users')
    }

    const data = await response.json()
    renderUsersTable(data.users || [], data.total || 0, page)
    currentUsersPage = page

  } catch (error) {
    console.error('Error loading users:', error)
    document.getElementById('users-table-body').innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-8 text-center text-red-500">
          Error loading: ${error.message}
        </td>
      </tr>
    `
  }
}

function renderUsersTable(users, total, page) {
  const tbody = document.getElementById('users-table-body')
  const totalPages = Math.ceil(total / usersPerPage)

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-3 sm:px-4 py-8 text-center text-gray-500">Aucun utilisateur trouvé</td>
      </tr>
    `
    return
  }

  tbody.innerHTML = users.map(user => {
    const date = new Date(user.created_at).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

    const planNames = { starter: 'Starter', pro: 'Pro', plus: 'Plus' }
    const roleBadge = user.role === 'admin' 
      ? '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">ADMIN</span>'
      : '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">User</span>'

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">
          <div class="truncate max-w-[150px] sm:max-w-none">${user.email}</div>
          <div class="sm:hidden text-xs text-gray-500 mt-1">${date}</div>
        </td>
        <td class="px-3 sm:px-4 py-3 text-sm text-gray-600 capitalize">${planNames[user.plan] || user.plan}</td>
        <td class="px-3 sm:px-4 py-3 text-sm">${roleBadge}</td>
        <td class="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">${date}</td>
        <td class="px-3 sm:px-4 py-3 text-sm">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select onchange="updateUserPlan('${user.id}', this.value)" class="w-full sm:w-auto text-xs border border-gray-300 rounded px-2 py-1">
              <option value="starter" ${user.plan === 'starter' ? 'selected' : ''}>Starter</option>
              <option value="pro" ${user.plan === 'pro' ? 'selected' : ''}>Pro</option>
              <option value="plus" ${user.plan === 'plus' ? 'selected' : ''}>Plus</option>
            </select>
            <button onclick="toggleUserRole('${user.id}', '${user.role}')" class="w-full sm:w-auto text-xs px-2 py-1 ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'} rounded hover:opacity-80 whitespace-nowrap">
              ${user.role === 'admin' ? 'Remove Admin' : 'Grant Admin'}
            </button>
          </div>
        </td>
      </tr>
    `
  }).join('')

  // Pagination
  document.getElementById('users-pagination-info').textContent = 
    `Page ${page} sur ${totalPages} • ${total} utilisateurs`

  const pagination = document.getElementById('users-pagination')
  pagination.innerHTML = ''
  
  if (page > 1) {
    pagination.innerHTML += `<button onclick="loadUsers(${page - 1})" class="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm hover:bg-gray-50 whitespace-nowrap">Précédent</button>`
  }
  
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pagination.innerHTML += `<button onclick="loadUsers(${i})" class="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm ${i === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}">${i}</button>`
  }
  
  if (page < totalPages) {
    pagination.innerHTML += `<button onclick="loadUsers(${page + 1})" class="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm hover:bg-gray-50 whitespace-nowrap">Suivant</button>`
  }
}

// Global functions for user management
window.updateUserPlan = async function(userId, plan) {
  const token = getAuthToken()
  if (!token) return

  try {
    const response = await fetch(`/api/v1/admin/users/${userId}/plan`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ plan })
    })

    if (!response.ok) throw new Error('Error updating')
    
    loadUsers(currentUsersPage)
    alert('Plan mis à jour avec succès')
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

window.toggleUserRole = async function(userId, currentRole) {
  const token = getAuthToken()
  if (!token) return

  const newRole = currentRole === 'admin' ? 'user' : 'admin'
  const confirmMessage = newRole === 'admin' 
    ? 'Grant admin rights to this user?'
    : 'Remove admin rights from this user?'

  if (!confirm(confirmMessage)) return

  try {
    const response = await fetch(`/api/v1/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: newRole })
    })

    if (!response.ok) throw new Error('Error updating')
    
    loadUsers(currentUsersPage)
    alert('Rôle mis à jour avec succès')
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

// Make loadUsers available globally
window.loadUsers = loadUsers

// Scraper functions
const scrapingHistory = []

window.triggerScraper = async function(source, inputId) {
  const token = getAuthToken()
  if (!token) {
    alert('Vous devez être connecté')
    return
  }

  const urlInput = document.getElementById(inputId)
  const searchUrl = urlInput.value.trim()
  const statusDiv = document.getElementById(`${source.replace('.', '').replace(' ', '').toLowerCase()}-status`)

  if (!searchUrl) {
    alert('Please enter a search URL')
    return
  }

  // Update status
  statusDiv.innerHTML = `
    <div class="text-blue-600 space-y-1">
      <div class="font-semibold">⏳ Scraping in progress...</div>
      <div class="text-xs">Initialisation du scraper...</div>
      <div class="text-xs" id="scraper-progress-${source}"></div>
    </div>
  `
  const button = urlInput.nextElementSibling
  button.disabled = true
  button.textContent = 'Scraping...'

  let runId = null
  scraperPollInterval = null

  try {
    console.log(`🚀 Starting scraper for ${source} with URL:`, searchUrl)
    
    const response = await fetch('/api/v1/scraper/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: source,
        searchUrls: [searchUrl],
        resultLimitPerThread: 100,
        maxResults: 1000
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error during scraping')
    }

    // Get runId for polling
    runId = data.runId
    if (runId) {
      // Poll for status updates
      scraperPollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/v1/scraper/run/${runId}/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const statusData = await statusResponse.json()
          
          if (statusData.success) {
            const progressDiv = document.getElementById(`scraper-progress-${source}`)
            if (progressDiv) {
              const status = statusData.status
              const stats = statusData.stats || {}
              
              if (status === 'RUNNING') {
                const itemsScraped = stats.itemsScraped || 0
                progressDiv.textContent = `Status: Running • ${itemsScraped.toLocaleString('en-US')} listings scraped...`
              } else if (status === 'SUCCEEDED') {
                clearInterval(scraperPollInterval)
                scraperPollInterval = null
                // Final result will be in the original response
                updateScraperStatusComplete(source, data, statusDiv, button)
              } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
                clearInterval(scraperPollInterval)
                scraperPollInterval = null
                statusDiv.innerHTML = `
                  <div class="text-red-600">
                    <div class="font-semibold">❌ Scraping ${status === 'FAILED' ? 'failed' : status === 'TIMED-OUT' ? 'timed out' : 'cancelled'}</div>
                    <div class="text-xs">Status: ${status}</div>
                  </div>
                `
                button.disabled = false
                button.textContent = 'Run scraper'
              }
            }
          }
        } catch (pollError) {
          console.warn('Error polling scraper status:', pollError)
        }
      }, 5000) // Poll every 5 seconds
    }

    // Success - but wait for completion if polling
    if (!runId) {
      // Immediate completion (shouldn't happen, but handle it)
      updateScraperStatusComplete(source, data, statusDiv, button)
    }

  } catch (error) {
    if (scraperPollInterval) {
      clearInterval(scraperPollInterval)
      scraperPollInterval = null
    }
    console.error('❌ Scraper error:', error)
    statusDiv.innerHTML = `
      <div class="text-red-600">
        <div class="font-semibold">❌ Error</div>
        <div class="text-xs">${error.message}</div>
      </div>
    `
    button.disabled = false
    button.textContent = 'Run scraper'
  }
}

function updateScraperStatusComplete(source, result, statusDiv, button) {
  const historyEntry = {
    source,
    url: result.searchUrls?.[0] || 'N/A',
    timestamp: new Date().toISOString(),
    totalScraped: result.totalScraped || 0,
    saved: result.saved || 0,
    runId: result.runId
  }
  
  scrapingHistory.unshift(historyEntry)
  if (scrapingHistory.length > 10) scrapingHistory.pop()
  
  updateScrapingHistory()
  
  statusDiv.innerHTML = `
    <div class="text-green-600 space-y-1">
      <div class="font-semibold">✅ Scraping terminé</div>
      <div class="text-xs">Scrapé: ${result.totalScraped || 0} annonces</div>
      <div class="text-xs">Sauvegardé: ${result.saved || 0} annonces</div>
      ${result.totalScraped === result.saved ? '<div class="text-xs text-green-700 font-semibold">✓ All listings have been saved</div>' : ''}
    </div>
  `
  
  button.disabled = false
  button.textContent = 'Run scraper'
  
  // Reload stats to update source distribution
  setTimeout(() => {
    loadAdminData()
  }, 2000)
}

function updateScrapingHistory() {
  const historyDiv = document.getElementById('scraping-history')
  if (!historyDiv) return

  if (scrapingHistory.length === 0) {
    historyDiv.innerHTML = '<div class="text-sm text-gray-500 text-center py-4">Aucun scraping récent</div>'
    return
  }

  historyDiv.innerHTML = scrapingHistory.map(entry => {
    const date = new Date(entry.timestamp).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const sourceNames = {
      'autoscout24': 'AutoScout24',
      'mobile.de': 'mobile.de',
      'leboncoin': 'LeBonCoin',
      'largus': 'L\'Argus',
      'blocket': 'Blocket.se',
      'bilweb': 'Bilweb.se',
      'bytbil': 'Bytbil.com',
      'gaspedaal': 'Gaspedaal.nl',
      '2ememain': '2ememain.be'
    }
    
    const getBadgeClass = (source) => {
      if (source === 'autoscout24') return 'bg-blue-100 text-blue-700'
      if (source === 'mobile.de') return 'bg-green-100 text-green-700'
      if (source === 'leboncoin') return 'bg-purple-100 text-purple-700'
      if (source === 'largus') return 'bg-amber-100 text-amber-700'
      if (source === 'blocket') return 'bg-yellow-100 text-yellow-700'
      if (source === 'bilweb') return 'bg-orange-100 text-orange-700'
      if (source === 'bytbil') return 'bg-pink-100 text-pink-700'
      if (source === 'finn') return 'bg-cyan-100 text-cyan-700'
      if (source === 'otomoto') return 'bg-indigo-100 text-indigo-700'
      if (source === 'gaspedaal') return 'bg-red-100 text-red-700'
      if (source === 'marktplaats') return 'bg-orange-100 text-orange-700'
      if (source === '2ememain') return 'bg-teal-100 text-teal-700'
      return 'bg-gray-100 text-gray-700'
    }
    
    return `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center space-x-3">
          <span class="px-2 py-1 ${getBadgeClass(entry.source)} rounded text-xs font-medium">${sourceNames[entry.source] || entry.source}</span>
          <div class="text-sm text-gray-600">
            <div class="font-medium">${entry.saved} listings saved</div>
            <div class="text-xs text-gray-500">${date}</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 text-right sm:text-left">
          ${entry.totalScraped} scraped
        </div>
      </div>
    `
  }).join('')
}

// Scraper Dashboard - auto-refresh interval (cleared on page unload)
let scraperDashboardRefreshInterval = null
let scraperPollInterval = null

/** Clear all admin dashboard timers. Call before navigating away. */
export function cleanupAdminDashboard() {
  if (scraperPollInterval) {
    clearInterval(scraperPollInterval)
    scraperPollInterval = null
  }
  if (scraperDashboardRefreshInterval) {
    clearInterval(scraperDashboardRefreshInterval)
    scraperDashboardRefreshInterval = null
  }
  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

const SOURCE_NAMES = {
  'autoscout24': 'AutoScout24',
  'mobile.de': 'mobile.de',
  'mobile_de': 'mobile.de',
  'mobilede': 'mobile.de',
  'leboncoin': 'LeBonCoin',
  'largus': "L'Argus",
  'lacentrale': 'lacentrale',
  'blocket': 'Blocket.se',
  'bilweb': 'Bilweb.se',
  'bytbil': 'Bytbil.com',
  'finn': 'FINN.no',
  'otomoto': 'OtoMoto.pl',
  'subito': 'Subito.it',
  'gaspedaal': 'Gaspedaal.nl',
  'marktplaats': 'Marktplaats.nl'
}

async function loadScraperDashboard() {
  const container = document.getElementById('scraper-dashboard-content')
  if (!container) return

  const token = getAuthToken()
  if (!token) return

  try {
    const response = await fetch('/api/v1/admin/scraper-dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      if (response.status === 401) handle401Error()
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error ${response.status}`)
    }

    const data = await response.json()
    renderScraperDashboard(data)
    const lastUpdateEl = document.getElementById('scraper-dashboard-last-update')
    if (lastUpdateEl) lastUpdateEl.textContent = `Updated: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
  } catch (error) {
    console.error('Error loading scraper dashboard:', error)
    container.innerHTML = `
      <div class="text-center py-8 text-red-500 space-y-2">
        <p class="font-semibold">Error loading</p>
        <p class="text-sm">${error.message}</p>
        <button onclick="loadScraperDashboard()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">Réessayer</button>
      </div>
    `
  }
}

window.loadScraperDashboard = loadScraperDashboard

async function loadUsageMonitoring() {
  const container = document.getElementById('usage-monitoring-content')
  if (!container) return
  const token = getAuthToken()
  if (!token) return

  try {
    const response = await fetch('/api/v1/admin/users/near-limits?threshold=80', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    const users = data.users || []

    if (users.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <svg class="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="font-medium">No users near their plan limits</p>
          <p class="text-sm mt-1">All users are below 80% of their quota this month.</p>
        </div>`
      return
    }

    const planColors = { starter: 'bg-gray-100 text-gray-700', pro: 'bg-blue-100 text-blue-700', plus: 'bg-purple-100 text-purple-700' }
    const pctColor = (pct) => pct >= 100 ? 'text-red-600 font-bold' : pct >= 80 ? 'text-orange-500 font-semibold' : 'text-gray-600'
    const barColor = (pct) => pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-blue-500'

    container.innerHTML = `
      <div class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Searches (this month)</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alerts (active)</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peak usage</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            ${users.map(u => {
              const planBadge = planColors[u.plan] || 'bg-gray-100 text-gray-700'
              const searchLimit = u.searches.limit === -1 ? '∞' : u.searches.limit
              const alertLimit = u.alerts.limit === -1 ? '∞' : u.alerts.limit
              return `
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">${u.email}</td>
                  <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planBadge}">${u.plan}</span></td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="${pctColor(u.searches.pct)}">${u.searches.count} / ${searchLimit}</span>
                      <div class="flex-1 max-w-24 bg-gray-200 rounded-full h-1.5">
                        <div class="${barColor(u.searches.pct)} h-1.5 rounded-full" style="width:${Math.min(100, u.searches.pct)}%"></div>
                      </div>
                      <span class="text-xs text-gray-400">${u.searches.pct}%</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="${pctColor(u.alerts.pct)}">${u.alerts.count} / ${alertLimit}</span>
                      <div class="flex-1 max-w-24 bg-gray-200 rounded-full h-1.5">
                        <div class="${barColor(u.alerts.pct)} h-1.5 rounded-full" style="width:${Math.min(100, u.alerts.pct)}%"></div>
                      </div>
                      <span class="text-xs text-gray-400">${u.alerts.pct}%</span>
                    </div>
                  </td>
                  <td class="px-4 py-3"><span class="${pctColor(u.max_usage_pct)} text-base">${u.max_usage_pct}%</span></td>
                </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-400 mt-3">Showing ${users.length} user${users.length !== 1 ? 's' : ''} at ≥80% of plan quota.</p>`
  } catch (error) {
    console.error('Error loading usage monitoring:', error)
    container.innerHTML = `
      <div class="text-center py-6 text-red-500 text-sm">
        <p>Failed to load usage data.</p>
        <button onclick="loadUsageMonitoring()" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">Retry</button>
      </div>`
  }
}

window.loadUsageMonitoring = loadUsageMonitoring

async function toggleScraperPause(id, currentEnabled) {
  const token = getAuthToken()
  if (!token) return

  try {
    const response = await fetch(`/api/v1/admin/auto-scrapers/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ enabled: !currentEnabled })
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `Error ${response.status}`)
    }
    await loadScraperDashboard()
  } catch (error) {
    console.error('Error toggling scraper:', error)
    alert('Error: ' + error.message)
  }
}

window.toggleScraperPause = toggleScraperPause

function renderScraperDashboard(data) {
  const container = document.getElementById('scraper-dashboard-content')
  if (!container) return

  const { totals, by_website, crons } = data
  const t = totals || { runs_ok: 0, runs_pending: 0, runs_failed: 0, runs_total: 0 }

  const completionRate = t.runs_total > 0
    ? ((t.runs_ok / t.runs_total) * 100).toFixed(1)
    : '100'
  const completionColor = parseFloat(completionRate) >= 95 ? 'text-green-600' : parseFloat(completionRate) >= 80 ? 'text-amber-600' : 'text-red-600'

  let html = `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      <div class="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
        <div class="text-xs sm:text-sm font-medium text-green-800">Runs OK</div>
        <div class="text-xl sm:text-2xl font-bold text-green-900">${(t.runs_ok || 0).toLocaleString('en-US')}</div>
        <div class="text-xs text-green-600 mt-1 hidden sm:block">Succès (7 derniers jours)</div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div class="text-xs sm:text-sm font-medium text-blue-800">Running</div>
        <div class="text-xl sm:text-2xl font-bold text-blue-900">${(t.runs_pending || 0).toLocaleString('en-US')}</div>
        <div class="text-xs text-blue-600 mt-1 hidden sm:block">Running</div>
      </div>
      <div class="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
        <div class="text-xs sm:text-sm font-medium text-red-800">Failed</div>
        <div class="text-xl sm:text-2xl font-bold text-red-900">${(t.runs_failed || 0).toLocaleString('en-US')}</div>
        <div class="text-xs text-red-600 mt-1 hidden sm:block">Failed</div>
      </div>
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
        <div class="text-xs sm:text-sm font-medium text-gray-800">Total runs</div>
        <div class="text-xl sm:text-2xl font-bold text-gray-900">${(t.runs_total || 0).toLocaleString('en-US')}</div>
        <div class="text-xs text-gray-600 mt-1 hidden sm:block">7 derniers jours</div>
      </div>
      <div class="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
        <div class="text-xs sm:text-sm font-medium text-gray-800">Taux complétion</div>
        <div class="text-xl sm:text-2xl font-bold ${completionColor}">${completionRate}%</div>
        <div class="text-xs text-gray-600 mt-1 hidden sm:block">OK / total</div>
      </div>
    </div>

    <div class="mb-6 overflow-hidden">
      <h3 class="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Par site</h3>
      <p class="text-xs text-gray-500 mb-2 sm:mb-3">Runs = executions. Listings = in database. Queue URLs = pending.</p>
      <div class="sm:hidden space-y-3 overflow-x-hidden">
  `

  function formatQueueUrls(row) {
    const pending = row.queue_urls_pending || 0
    const processing = row.queue_urls_processing || 0
    if (processing > 0 && pending > 0) return pending.toLocaleString('en-US') + ' <span class="text-blue-600">(' + processing + ' en cours)</span>'
    if (processing > 0) return '<span class="text-blue-600">' + processing + ' running</span>'
    return pending.toLocaleString('en-US')
  }

  function formatTimeTo100(days) {
    if (days == null || days <= 0 || !isFinite(days)) return '—'
    if (days < 1) return '< 1 j'
    if (days < 30) return Math.round(days) + ' j'
    if (days < 365) return (days / 30).toFixed(1).replace(/\.0$/, '') + ' mois'
    return (days / 365).toFixed(1).replace(/\.0$/, '') + ' an' + (days >= 365 * 2 ? 's' : '')
  }

  let mobileCardsHtml = ''
  let tableRowsHtml = ''

  if (by_website && by_website.length > 0) {
    // Tri auto : 1) Statut (Actif > Pausé > —) 2) % scraped décroissant 3) nom du site
    const statusRank = (row) => {
      const c = row.crons?.[0]
      if (!c) return 2  // — en dernier
      return c.enabled !== false ? 0 : 1  // Actif=0, Pausé=1
    }
    const pct = (row) => {
      if (!(row.site_total_available > 0)) return -1
      const r = (row.listings_total || 0) / row.site_total_available
      return r <= 1 ? r : -1  // >100% = incohérent, même traitement que "—"
    }
    const name = (row) => (SOURCE_NAMES[row.source] || row.source).toLowerCase()
    by_website.sort((a, b) => {
      const sa = statusRank(a), sb = statusRank(b)
      if (sa !== sb) return sa - sb
      const pa = pct(a), pb = pct(b)
      if (pa !== pb) return pb - pa
      return name(a).localeCompare(name(b))
    })
    let listingsSum = 0
    let totals = { ok: 0, pending: 0, failed: 0, raw_pending: 0, queue_urls: 0, queue_processing: 0, listings: 0 }
    by_website.forEach((row) => {
      totals.ok += row.runs_ok || 0
      totals.pending += row.runs_pending || 0
      totals.failed += row.runs_failed || 0
      totals.raw_pending += row.raw_pending || 0
      totals.queue_urls += row.queue_urls_pending || 0
      totals.queue_processing += row.queue_urls_processing || 0
      listingsSum += row.listings_total || 0
    })
    by_website.forEach((row) => {
      const siteTotal = row.site_total_available || 0
      let pctScraped = null
      if (siteTotal > 0) {
        const raw = (row.listings_total || 0) / siteTotal * 100
        pctScraped = raw <= 100 ? raw.toFixed(1) : null  // >100% = données incohérentes (site_total sous-estimé)
      }
      const pctShare = listingsSum > 0 ? ((row.listings_total || 0) / listingsSum * 100).toFixed(1) : '0'
      const name = SOURCE_NAMES[row.source] || row.source
      const lr = row.last_run
      const ls = row.last_success
      let lastRunText = '—'
      if (lr) {
        const date = lr.finished_at || lr.started_at
        const dateStr = date ? new Date(date).toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
        const status = (lr.status || '').toLowerCase()
        if (status === 'success') {
          lastRunText = lr.total_saved != null
            ? (lr.total_saved || 0).toLocaleString('en-US') + ' saved'
            : 'OK ' + dateStr
          if (lr.total_scraped != null && lr.total_scraped !== lr.total_saved) {
            lastRunText = (lr.total_scraped || 0).toLocaleString('en-US') + ' scraped, ' + lastRunText
          }
        } else if (status === 'failed') {
          lastRunText = lr.error_count != null ? lr.error_count + ' errors' : 'Failed'
        } else if (status === 'running') {
          lastRunText = 'Running'
        } else {
          lastRunText = dateStr ? '— ' + dateStr : '—'
        }
        if (dateStr && lastRunText !== 'Running' && !lastRunText.startsWith('—')) lastRunText += ' (' + dateStr + ')'
      }
      let lastSuccessText = '—'
      if (ls) {
        const dateStr = (ls.finished_at || ls.started_at) ? new Date(ls.finished_at || ls.started_at).toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
        lastSuccessText = ls.total_saved != null
          ? (ls.total_saved || 0).toLocaleString('en-US') + ' saved'
          : 'OK'
        if (ls.total_scraped != null && ls.total_scraped !== ls.total_saved) {
          lastSuccessText = (ls.total_scraped || 0).toLocaleString('en-US') + ' scraped, ' + lastSuccessText
        }
        if (dateStr) lastSuccessText += ' (' + dateStr + ')'
      }

      const primaryCron = row.crons?.[0]
      let statusBadge = ''
      let statusButton = ''
      if (primaryCron) {
        const isEnabled = primaryCron.enabled !== false
        statusBadge = isEnabled
          ? '<span class="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>'
          : '<span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">Paused</span>'
        statusButton = isEnabled
          ? `<button type="button" onclick="toggleScraperPause('${primaryCron.id}', true)" class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700">Pause</button>`
          : `<button type="button" onclick="toggleScraperPause('${primaryCron.id}', false)" class="px-2 py-1 text-xs rounded border border-green-300 bg-green-50 hover:bg-green-100 text-green-800">Reprendre</button>`
      } else {
        statusBadge = '<span class="px-2 py-0.5 rounded text-xs text-gray-500" title="Import externe ou pas de cron">—</span>'
      }

      mobileCardsHtml += `
        <div class="border border-gray-200 rounded-lg p-3 bg-white min-w-0">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="font-semibold text-gray-900 text-sm truncate">${name}</span>
            <div class="flex items-center gap-1.5 shrink-0">
              ${statusBadge}
              ${statusButton}
            </div>
          </div>
          <div class="text-xs text-gray-500 mb-2">${(row.listings_total || 0).toLocaleString('en-US')} listings${pctScraped != null ? ` <span class="text-blue-600 font-semibold" title="scraped / total on site">(${pctScraped}% scraped)</span>` : pctShare !== '0' ? ` <span class="text-gray-500">(${pctShare}% base)</span>` : ''}</span></div>
          <div class="grid grid-cols-3 gap-2 mb-2">
            <div class="text-center p-1.5 rounded ${row.runs_ok > 0 ? 'bg-green-50' : 'bg-gray-50'}">
              <div class="text-xs text-gray-500">OK</div>
              <div class="font-bold text-sm ${row.runs_ok > 0 ? 'text-green-700' : 'text-gray-400'}">${row.runs_ok}</div>
            </div>
            <div class="text-center p-1.5 rounded ${row.runs_pending > 0 ? 'bg-blue-50' : 'bg-gray-50'}">
              <div class="text-xs text-gray-500">Running</div>
              <div class="font-bold text-sm ${row.runs_pending > 0 ? 'text-blue-700' : 'text-gray-400'}">${row.runs_pending}</div>
            </div>
            <div class="text-center p-1.5 rounded ${row.runs_failed > 0 ? 'bg-red-50' : 'bg-gray-50'}">
              <div class="text-xs text-gray-500">Failed</div>
              <div class="font-bold text-sm ${row.runs_failed > 0 ? 'text-red-700' : 'text-gray-400'}">${row.runs_failed}</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
            <span>Last: ${lastRunText}</span>
            ${ls && lastSuccessText !== '—' ? '<span class="text-green-600">Last OK: ' + lastSuccessText + '</span>' : ''}
            ${(row.queue_urls_pending || row.queue_urls_processing) ? '<span>Queue: ' + formatQueueUrls(row) + '</span>' : ''}
            ${row.time_to_100_days != null ? '<span class="text-blue-600" title="Estimation au rythme récent (runs 7j + listings 14j)">→ 100%: ' + formatTimeTo100(row.time_to_100_days) + '</span>' : ''}
          </div>
        </div>
      `

      tableRowsHtml += `
        <tr class="hover:bg-gray-50">
          <td class="px-3 sm:px-4 py-2 font-medium text-gray-900 bg-white whitespace-nowrap">${name}</td>
          <td class="px-3 sm:px-4 py-2 whitespace-nowrap">
            <div class="flex items-center gap-1.5">
              ${statusBadge}
              ${statusButton}
            </div>
          </td>
          <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap"><span class="px-2 py-1 rounded ${row.runs_ok > 0 ? 'bg-green-100 text-green-800' : 'text-gray-400'}">${row.runs_ok}</span></td>
          <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap"><span class="px-2 py-1 rounded ${row.runs_pending > 0 ? 'bg-blue-100 text-blue-800' : 'text-gray-400'}">${row.runs_pending}</span></td>
          <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap"><span class="px-2 py-1 rounded ${row.runs_failed > 0 ? 'bg-red-100 text-red-800' : 'text-gray-400'}">${row.runs_failed}</span></td>
          <td class="px-3 sm:px-4 py-2 text-right text-xs text-gray-600 whitespace-nowrap" title="${lr?.finished_at || lr?.started_at || ''}">${lastRunText}</td>
          <td class="px-3 sm:px-4 py-2 text-right text-xs text-green-600 whitespace-nowrap" title="${ls?.finished_at || ls?.started_at || ''}">${lastSuccessText}</td>
          <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap">${(row.raw_pending || 0).toLocaleString('en-US')}</td>
          <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap">${formatQueueUrls(row)}</td>
          <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap font-medium" title="${pctScraped != null ? 'scraped / total on site' : 'share of our database'}">${pctScraped != null ? pctScraped + '%' : '—'}</td>
          <td class="px-3 sm:px-4 py-2 text-right text-xs text-gray-600 whitespace-nowrap" title="Estimation au rythme récent (runs 7j + listings 14j)">${formatTimeTo100(row.time_to_100_days)}</td>
          <td class="px-3 sm:px-4 py-2 text-right whitespace-nowrap">${(row.listings_total || 0).toLocaleString('en-US')}</td>
        </tr>
      `
    })
    totals.listings = t.listings_total || listingsSum
    totals.time_to_100_days = t.time_to_100_days

    mobileCardsHtml += `
      <div class="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-gray-900 text-sm">Total</span>
          <span class="text-xs font-bold text-gray-700">${totals.listings.toLocaleString('en-US')} listings</span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="text-center p-1.5 rounded bg-green-50">
            <div class="text-xs text-gray-500">OK</div>
            <div class="font-bold text-sm text-green-700">${totals.ok.toLocaleString('en-US')}</div>
          </div>
          <div class="text-center p-1.5 rounded bg-blue-50">
            <div class="text-xs text-gray-500">Running</div>
            <div class="font-bold text-sm text-blue-700">${totals.pending.toLocaleString('en-US')}</div>
          </div>
          <div class="text-center p-1.5 rounded bg-red-50">
            <div class="text-xs text-gray-500">Failed</div>
            <div class="font-bold text-sm text-red-700">${totals.failed.toLocaleString('en-US')}</div>
          </div>
        </div>
        ${totals.queue_urls > 0 || totals.queue_processing > 0 ? '<div class="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">Queue: ' + (totals.queue_processing > 0 ? totals.queue_urls.toLocaleString('en-US') + ' (' + totals.queue_processing + ' running)' : totals.queue_urls.toLocaleString('en-US')) + '</div>' : ''}
        ${totals.time_to_100_days != null ? '<div class="text-xs text-blue-600 font-medium border-t border-gray-200 pt-2 mt-2" title="Rythme récent (runs 7j + listings 14j)">→ 100% total: ' + formatTimeTo100(totals.time_to_100_days) + '</div>' : ''}
      </div>
    `

    tableRowsHtml += `
        <tr class="bg-gray-100 font-semibold border-t-2 border-gray-300">
          <td class="px-3 sm:px-4 py-2 text-gray-900 bg-gray-100 whitespace-nowrap">Total</td>
          <td class="px-3 sm:px-4 py-2 bg-gray-100"></td>
          <td class="px-3 sm:px-4 py-2 text-right">${totals.ok.toLocaleString('en-US')}</td>
          <td class="px-3 sm:px-4 py-2 text-right">${totals.pending.toLocaleString('en-US')}</td>
          <td class="px-3 sm:px-4 py-2 text-right">${totals.failed.toLocaleString('en-US')}</td>
          <td class="px-3 sm:px-4 py-2 text-right"></td>
          <td class="px-3 sm:px-4 py-2 text-right"></td>
          <td class="px-3 sm:px-4 py-2 text-right">${totals.raw_pending.toLocaleString('en-US')}</td>
          <td class="px-3 sm:px-4 py-2 text-right">${totals.queue_processing > 0 ? totals.queue_urls.toLocaleString('en-US') + ' (' + totals.queue_processing + ' running)' : totals.queue_urls.toLocaleString('en-US')}</td>
          <td class="px-3 sm:px-4 py-2 text-right font-medium">—</td>
          <td class="px-3 sm:px-4 py-2 text-right bg-gray-100 font-medium" title="Temps estimé pour atteindre 100% (rythme récent: runs 7j + listings 14j)">${formatTimeTo100(totals.time_to_100_days)}</td>
          <td class="px-3 sm:px-4 py-2 text-right">${totals.listings.toLocaleString('en-US')}</td>
        </tr>
      `
  } else {
    mobileCardsHtml += '<div class="text-center text-gray-500 py-8">No data</div>'
    tableRowsHtml += '<tr><td colspan="12" class="px-4 py-8 text-center text-gray-500">No data</td></tr>'
  }

  html += mobileCardsHtml
  html += `</div>
      <div class="hidden sm:block overflow-x-auto overflow-y-visible rounded-lg border border-gray-200 -mx-2 sm:mx-0 touch-pan-x" style="max-width: 100%; -webkit-overflow-scrolling: touch">
        <table class="min-w-[640px] divide-y divide-gray-200 text-sm table-sticky-col">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 whitespace-nowrap">Site</th>
              <th class="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 whitespace-nowrap">Status</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" title="Runs réussis">Runs OK</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Running</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Failed</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Last run</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" title="Last successful run">Last success</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Raw en attente</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" title="mobile.de URLs to enrich">Queue URLs</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" title="% scraped par rapport au total sur le site">% scraped</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" title="Temps estimé pour atteindre 100% (rythme récent)">→ 100%</th>
              <th class="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" title="Annonces en base">Listings</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    </div>`

  if (crons && crons.length > 0) {
    html += `
      <div class="overflow-hidden">
        <h3 class="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Crons (scrapings automatiques)</h3>
        <div class="space-y-2">
    `
    crons.forEach((c) => {
      const lastRun = c.last_run_at ? new Date(c.last_run_at).toLocaleString('en-US') : 'Jamais'
      const statusClass = c.last_run_status === 'success' ? 'bg-green-100 text-green-800' : c.last_run_status === 'running' ? 'bg-blue-100 text-blue-800' : c.last_run_status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
      const enabledBadge = c.enabled ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Active</span>' : '<span class="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">Disabled</span>'
      const lastResult = c.last_run_result ? ` (${c.last_run_result.saved || 0} saved)` : ''
      html += `
        <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium text-gray-900 text-sm sm:text-base">${SOURCE_NAMES[c.source] || c.source}</span>
            ${c.name && c.name !== (SOURCE_NAMES[c.source] || c.source) ? `<span class="text-gray-500 text-xs">${c.name}</span>` : ''}
            ${enabledBadge}
            <span class="px-2 py-0.5 rounded text-xs font-mono bg-white border border-gray-200 break-all">${c.cron}</span>
          </div>
          <div class="text-xs text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
            Last run: ${lastRun}
            <span class="px-2 py-0.5 rounded ${statusClass}">${c.last_run_status || '-'}</span>
            ${lastResult}
          </div>
        </div>
      `
    })
    html += '</div></div>'
  }

  container.innerHTML = html
}

// Auto Scrapers Management
async function loadAutoScrapers() {
  const token = getAuthToken()
  if (!token) return

  const container = document.getElementById('auto-scrapers-list')
  if (!container) return

  // Show loading state
  container.innerHTML = `
    <div class="text-center py-8 text-gray-500">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2">Loading...</p>
    </div>
  `

  try {
    console.log('📡 Chargement des scrapings automatiques...')
    const response = await fetch('/api/v1/admin/auto-scrapers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('📊 Réponse API:', response.status, response.statusText)

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        handle401Error()
        return
      }
      
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ API Error:', errorData)
      throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Données reçues:', data)
    console.log('📋 Nombre de scrapings:', data.scrapers?.length || 0)
    
    renderAutoScrapers(data.scrapers || [])
    
    // Auto-refresh more frequently if any scraper is running (every 3 seconds for real-time updates)
    // IMPORTANT: Clear any existing timer before creating a new one to prevent multiple timers
    if (autoRefreshTimer) {
      clearTimeout(autoRefreshTimer)
      autoRefreshTimer = null
    }
    
    const hasRunningScraper = (data.scrapers || []).some(s => s.last_run_status === 'running')
    if (hasRunningScraper) {
      autoRefreshTimer = setTimeout(() => {
        autoRefreshTimer = null
        loadAutoScrapers()
      }, 3000) // Refresh every 3 seconds during scraping
    }
  } catch (error) {
    console.error('❌ Error loading auto scrapers:', error)
    container.innerHTML = `
      <div class="text-center py-8 text-red-500 space-y-2">
        <p class="font-semibold">Error loading</p>
        <p class="text-sm">${error.message}</p>
        <button onclick="loadAutoScrapers()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
          Réessayer
        </button>
      </div>
    `
  }
}

// Global variable to track auto-refresh timer
let autoRefreshTimer = null

// Make loadAutoScrapers available globally
window.loadAutoScrapers = loadAutoScrapers

async function loadScraperRuns() {
  const container = document.getElementById('scraper-runs-list')
  if (!container) return

  const token = getAuthToken()
  if (!token) return

  const startedFrom = document.getElementById('runs-started-from')?.value || ''
  const startedTo = document.getElementById('runs-started-to')?.value || ''
  const status = document.getElementById('runs-status')?.value || ''
  const source = document.getElementById('runs-source')?.value || ''

  const params = new URLSearchParams()
  params.set('limit', '50')
  params.set('offset', '0')
  if (startedFrom) params.set('started_from', new Date(startedFrom).toISOString())
  if (startedTo) params.set('started_to', new Date(startedTo).toISOString())
  if (status) params.set('status', status)
  if (source) params.set('source_platform', source)

  try {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-500">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm">Chargement...</p>
      </div>
    `

    const response = await fetch(`/api/v1/ingest/runs?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Error ${response.status}`)
    }

    const data = await response.json()
    renderScraperRuns(data.runs || [])
  } catch (error) {
    console.error('Error loading scraper runs:', error)
    container.innerHTML = `
      <div class="text-center py-4 text-red-500 space-y-2">
        <p class="font-semibold">Error loading</p>
        <p class="text-sm">${error.message}</p>
        <button onclick="loadScraperRuns()" class="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
          Réessayer
        </button>
      </div>
    `
  }
}

window.loadScraperRuns = loadScraperRuns

function renderScraperRuns(runs) {
  const container = document.getElementById('scraper-runs-list')
  if (!container) return

  if (!runs.length) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-500 text-sm">
        Aucun run trouvé pour ces filtres
      </div>
    `
    return
  }

  container.innerHTML = runs.map(run => {
    const started = run.started_at ? new Date(run.started_at).toLocaleString('en-US') : '-'
    const finished = run.finished_at ? new Date(run.finished_at).toLocaleString('en-US') : '-'
    const status = run.status || 'running'
    const statusColor = status === 'success' ? 'bg-green-100 text-green-700' : status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
    const webhookAttempts = Array.isArray(run.webhook_attempts) ? run.webhook_attempts : []
    const hasWebhookInfo = webhookAttempts.length > 0 || run.webhook_last_status || run.webhook_last_error || run.webhook_last_sent_at
    const webhookLastSent = run.webhook_last_sent_at ? new Date(run.webhook_last_sent_at).toLocaleString('en-US') : '-'
    const webhookAttemptsHtml = webhookAttempts.length
      ? webhookAttempts.map(attempt => `
        <div class="text-xs text-gray-600 flex justify-between">
          <span>#${attempt.attempt} • ${attempt.at || '-'}</span>
          <span class="${attempt.ok ? 'text-green-700' : 'text-red-700'}">${attempt.status || 'ERR'}</span>
        </div>
      `).join('')
      : '<div class="text-xs text-gray-500">Aucun log disponible</div>'

    return `
      <div class="border border-gray-200 rounded-lg p-3">
        <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 rounded text-xs ${statusColor} font-semibold">${status}</span>
            <span class="text-sm font-semibold text-gray-900">${run.source_platform}</span>
            <span class="text-xs text-gray-500">${run.id}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="viewRunListings('${run.id}')" class="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition">
              Voir annonces
            </button>
          <button onclick="exportRunListingsCsv('${run.id}')" class="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition">
            Export CSV
          </button>
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div><strong>Début:</strong> ${started}</div>
          <div><strong>Fin:</strong> ${finished}</div>
          <div><strong>Totaux:</strong> ${run.total_scraped || 0} / ${run.total_saved || 0} / ${run.total_failed || 0}</div>
        </div>
        ${run.error_message ? `<div class="mt-2 text-xs text-red-600">${run.error_message}</div>` : ''}
        ${hasWebhookInfo ? `
          <details class="mt-2">
            <summary class="text-xs text-blue-700 cursor-pointer">Webhook logs</summary>
            <div class="mt-2 text-xs text-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div><strong>Last status:</strong> ${run.webhook_last_status || '-'}</div>
              <div><strong>Last sent:</strong> ${webhookLastSent}</div>
              <div><strong>Error:</strong> ${run.webhook_last_error || '-'}</div>
            </div>
            <div class="mt-2 border border-gray-200 rounded p-2 bg-gray-50">
              ${webhookAttemptsHtml}
            </div>
          </details>
        ` : ''}
      </div>
    `
  }).join('')
}

async function exportScraperRunsCsv() {
  const token = getAuthToken()
  if (!token) return

  const startedFrom = document.getElementById('runs-started-from')?.value || ''
  const startedTo = document.getElementById('runs-started-to')?.value || ''
  const status = document.getElementById('runs-status')?.value || ''
  const source = document.getElementById('runs-source')?.value || ''

  const params = new URLSearchParams()
  if (startedFrom) params.set('started_from', new Date(startedFrom).toISOString())
  if (startedTo) params.set('started_to', new Date(startedTo).toISOString())
  if (status) params.set('status', status)
  if (source) params.set('source_platform', source)

  try {
    const response = await fetch(`/api/v1/ingest/runs/export/csv?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Error ${response.status}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scraper_runs.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting runs csv:', error)
    alert(`CSV export error: ${error.message}`)
  }
}

window.exportScraperRunsCsv = exportScraperRunsCsv

async function exportRunListingsCsv(runId) {
  const token = getAuthToken()
  if (!token) return

  try {
    const response = await fetch(`/api/v1/ingest/runs/${runId}/listings/export/csv`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Error ${response.status}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraper_run_${runId}_listings.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting run listings csv:', error)
    alert(`CSV export error: ${error.message}`)
  }
}

window.exportRunListingsCsv = exportRunListingsCsv

async function exportListingsCsv() {
  const token = getAuthToken()
  if (!token) return

  const source = document.getElementById('export-listings-source')?.value || ''
  const status = document.getElementById('export-listings-status')?.value || ''
  const country = document.getElementById('export-listings-country')?.value || ''
  const brand = document.getElementById('export-listings-brand')?.value || ''
  const model = document.getElementById('export-listings-model')?.value || ''
  const minPrice = document.getElementById('export-listings-min-price')?.value || ''
  const maxPrice = document.getElementById('export-listings-max-price')?.value || ''
  const minYear = document.getElementById('export-listings-min-year')?.value || ''
  const maxYear = document.getElementById('export-listings-max-year')?.value || ''
  const postedFrom = document.getElementById('export-listings-posted-from')?.value || ''
  const postedTo = document.getElementById('export-listings-posted-to')?.value || ''
  const limit = document.getElementById('export-listings-limit')?.value || ''

  const params = new URLSearchParams()
  if (source) params.set('source_platform', source)
  if (status) params.set('status', status)
  if (country) params.set('country', country)
  if (brand) params.set('brand', brand)
  if (model) params.set('model', model)
  if (minPrice) params.set('min_price', minPrice)
  if (maxPrice) params.set('max_price', maxPrice)
  if (minYear) params.set('min_year', minYear)
  if (maxYear) params.set('max_year', maxYear)
  if (postedFrom) params.set('posted_from', new Date(postedFrom).toISOString())
  if (postedTo) params.set('posted_to', new Date(postedTo).toISOString())
  if (limit) params.set('limit', limit)

  try {
    const response = await fetch(`/api/v1/admin/listings/export/csv?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Error ${response.status}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'listings_export.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting listings csv:', error)
    alert(`CSV export error: ${error.message}`)
  }
}

window.exportListingsCsv = exportListingsCsv

async function viewRunListings(runId) {
  const token = getAuthToken()
  if (!token) return

  const container = document.getElementById('scraper-runs-list')
  if (!container) return

  try {
    const response = await fetch(`/api/v1/ingest/runs/${runId}/listings?limit=50&offset=0`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Error ${response.status}`)
    }

    const data = await response.json()
    const listings = data.listings || []

    container.insertAdjacentHTML('afterbegin', `
      <div class="border border-blue-200 rounded-lg p-3 bg-blue-50">
        <div class="flex items-center justify-between mb-2">
          <div class="font-semibold text-blue-900 text-sm">Annonces du run ${runId}</div>
          <button onclick="this.closest('div').remove()" class="text-xs text-blue-700 hover:text-blue-900">Fermer</button>
        </div>
        ${listings.length === 0 ? '<div class="text-xs text-gray-600">No associated listing</div>' : `
          <div class="max-h-56 overflow-y-auto space-y-2">
            ${listings.map(l => `
              <div class="text-xs text-gray-700 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <div>${l.brand || ''} ${l.model || ''} ${l.year || ''}</div>
                <div class="text-right sm:text-left">${l.price ? new Intl.NumberFormat('en-US').format(l.price) : '-'} ${l.currency || ''}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `)
  } catch (error) {
    console.error('Error loading run listings:', error)
  }
}

// Load fastest selling models widget
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
    container.innerHTML = '<div class="text-center py-4 text-gray-500"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><p class="mt-2 text-sm">Chargement...</p></div>'
    const params = new URLSearchParams({ limit: '5', days: days.toString() })
    if (country) params.append('country', country)
    const response = await fetch(`/api/v1/analytics/fastest-selling-models?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Error loading')
    }

    const data = await response.json()
    let models = data.models || []
    models = [...models].sort((a, b) => {
      const velA = Number(a.velocityPerMonth) ?? 0
      const velB = Number(b.velocityPerMonth) ?? 0
      if (velB !== velA) return velB - velA
      return (b.salesCount ?? 0) - (a.salesCount ?? 0)
    })
    renderFastestModelsWidget(models)
  } catch (error) {
    console.error('Error loading fastest models:', error)
    container.innerHTML = `
      <div class="text-center py-4 text-gray-500 text-sm">
        <p>Error loading</p>
        <p class="text-xs mt-2">${error.message}</p>
      </div>
    `
  }
}

window.loadFastestModelsWidget = loadFastestModelsWidget

function renderFastestModelsWidget(models) {
  const container = document.getElementById('fastest-models-widget')
  if (!container) return

  if (models.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-500 text-sm">
        <p>No data available at the moment</p>
        <p class="text-xs mt-2">Data will appear after a few recorded sales</p>
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
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
        <div class="flex items-center space-x-3 flex-1">
          <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : index === 2 ? 'bg-orange-300' : 'bg-gray-200'} text-white font-bold text-sm">
            ${index + 1}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900 text-sm sm:text-base">${capitalize(model.brand)} ${capitalize(model.model)}${model.year && model.year !== 2000 ? ` ${model.year}` : ''}</div>
            ${model.variant ? `<div class="text-xs text-gray-600">${model.variant}</div>` : ''}
            <div class="text-xs text-gray-500">${model.salesCount} sales • ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(model.medianPrice || 0)}${model.countries && model.countries.length ? ' • ' + model.countries.map(c => ({ FR: 'France', SE: 'Sweden', DE: 'Germany' }[c] || c)).join(', ') : ''}</div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${domBg} ${domColor}" title="${model.averageDOM === 0 ? 'Vente le jour même ou annonce suivie moins d\'1 jour' : ''}">
            ⚡ ${model.averageDOM === 0 ? '< 1j' : model.averageDOM + 'j'}
          </span>
        </div>
      </div>
    `
  }).join('') + `
    <div class="mt-4 text-center">
      <a href="#/market-insights" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
        Voir tous les modèles →
      </a>
    </div>
  `
}

function renderAutoScrapers(scrapers) {
  const container = document.getElementById('auto-scrapers-list')
  
  // Count running scrapers
  const runningCount = scrapers.filter(s => s.last_run_status === 'running').length
  const runningCountEl = document.getElementById('running-scrapers-count')
  const runningCountNumberEl = document.getElementById('running-count-number')
  
  if (runningCountEl && runningCountNumberEl) {
    if (runningCount > 0) {
      runningCountNumberEl.textContent = runningCount
      runningCountEl.classList.remove('hidden')
    } else {
      runningCountEl.classList.add('hidden')
    }
  }
  
  if (scrapers.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>Aucun scraping automatique configuré</p>
        <button onclick="showCreateAutoScraperModal()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
          Créer le premier
        </button>
      </div>
    `
    return
  }

  const sourceNames = {
    'autoscout24': 'AutoScout24',
    'mobile.de': 'mobile.de',
    'leboncoin': 'LeBonCoin',
    'largus': 'L\'Argus',
    'blocket': 'Blocket.se',
    'bilweb': 'Bilweb.se',
    'bytbil': 'Bytbil.com',
    'finn': 'FINN.no',
    'otomoto': 'OtoMoto.pl',
    'gaspedaal': 'Gaspedaal.nl',
    '2ememain': '2ememain.be'
  }

  const sourceColors = {
    'autoscout24': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'mobile.de': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    'leboncoin': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    'largus': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    'blocket': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    'bilweb': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    'bytbil': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    'finn': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
    'otomoto': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    'gaspedaal': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    'marktplaats': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    '2ememain': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' }
  }

  container.innerHTML = scrapers.map(scraper => {
    const colors = sourceColors[scraper.source] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
    const lastRun = scraper.last_run_at 
      ? new Date(scraper.last_run_at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Jamais'
    const status = scraper.last_run_status === 'success' ? '✅' : scraper.last_run_status === 'error' ? '❌' : scraper.last_run_status === 'running' ? '⏳' : '⏸️'
    const statusLabel = scraper.last_run_status === 'success' ? 'Success' : scraper.last_run_status === 'error' ? 'Failed' : scraper.last_run_status === 'running' ? 'Running' : 'Idle'
    const statusBadge = scraper.last_run_status === 'success'
      ? 'bg-green-100 text-green-700'
      : scraper.last_run_status === 'error'
        ? 'bg-red-100 text-red-700'
        : scraper.last_run_status === 'running'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-700'
    const saved = scraper.last_run_result?.saved || 0

    const lastRunResult = scraper.last_run_result || {}
    const totalScraped = lastRunResult.totalScraped || 0
    const totalSaved = lastRunResult.saved || 0
    const isComplete = scraper.last_run_status === 'success' && totalScraped > 0
    const allSaved = isComplete && totalScraped === totalSaved
    
    return `
      <div class="border ${colors.border} rounded-lg p-4 ${scraper.enabled ? '' : 'opacity-60'}" data-scraper-id="${scraper.id}" data-cron="${scraper.schedule_cron}" data-urls-count="${scraper.search_urls.length}" data-max-results="${scraper.max_results || 1000}">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <h3 class="font-semibold text-gray-900">${scraper.name}</h3>
              <span class="px-2 py-1 ${colors.bg} ${colors.text} rounded text-xs font-medium">${sourceNames[scraper.source] || scraper.source}</span>
              ${scraper.enabled ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Actif</span>' : '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Inactif</span>'}
              <span class="px-2 py-1 rounded text-xs font-medium ${statusBadge}">${statusLabel}</span>
              ${scraper.last_run_status === 'running' ? '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs animate-pulse">⏳ En cours</span>' : ''}
            </div>
            <div class="text-sm text-gray-600 space-y-1">
              <p><strong>Planning:</strong> <code class="bg-gray-100 px-2 py-0.5 rounded text-xs">${scraper.schedule_cron}</code></p>
              <p><strong>URLs:</strong> ${scraper.search_urls.length} URL(s)</p>
              <p><strong>Limite:</strong> ${scraper.max_results >= 999999 ? '<span class="text-green-600 font-semibold">Sans limite (toutes les annonces)</span>' : `<span class="text-blue-600">${(scraper.max_results || 1000).toLocaleString('en-US')} annonces max</span> <span class="text-xs text-gray-500">(scraping incrémental)</span>`}</p>
              <p><strong>Dernière exécution:</strong> ${lastRun} ${status}</p>
              ${scraper.last_run_status === 'running' ? `
                <div class="mt-2 p-2 bg-blue-50 rounded border border-blue-200 animate-pulse">
                  <p class="font-semibold text-blue-900 mb-1">⏳ Scraping in progress...</p>
                  <p class="text-xs"><strong>Scrapé:</strong> <span class="font-semibold text-blue-600">${totalScraped.toLocaleString('en-US')}</span> annonces</p>
                  <p class="text-xs"><strong>Sauvegardé:</strong> <span class="font-semibold text-green-600">${totalSaved.toLocaleString('en-US')}</span> annonces</p>
                  ${totalScraped > 0 ? `<div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${Math.min((totalSaved / totalScraped) * 100, 100)}%"></div>
                  </div>` : ''}
                </div>
              ` : isComplete ? `
                <div class="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <p class="font-semibold text-gray-900 mb-1">📊 Résultats de la dernière exécution:</p>
                  <p class="text-xs"><strong>Scrapé:</strong> ${totalScraped.toLocaleString('en-US')} annonces</p>
                  <p class="text-xs"><strong>Sauvegardé:</strong> ${totalSaved.toLocaleString('en-US')} annonces</p>
                  ${allSaved ? '<p class="text-xs text-green-600 font-semibold mt-1">✓ All listings have been saved</p>' : totalScraped > totalSaved ? `<p class="text-xs text-orange-600 mt-1">⚠️ ${(totalScraped - totalSaved).toLocaleString('en-US')} listings not saved (doublons ou erreurs)</p>` : ''}
                  ${scraper.max_results >= 999999 && totalScraped > 0 ? '<p class="text-xs text-blue-600 mt-1">ℹ️ Unlimited scraping - all available listings have been scraped</p>' : ''}
                </div>
              ` : scraper.last_run_status === 'error' ? `
                <div class="mt-2 p-2 bg-red-50 rounded border border-red-200">
                  <p class="text-xs text-red-600"><strong>Error:</strong> ${lastRunResult.error || 'Unknown error'}</p>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="flex flex-wrap gap-2 lg:flex-col lg:items-end lg:ml-4">
            ${(scraper.last_run_status === 'error' || (scraper.last_run_status === 'success' && scraper.last_run_result?.processedUrls?.length > 0)) ? `
            <button onclick="resumeAutoScraperNow('${scraper.id}')" class="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition">
              🔄 Reprendre
            </button>
            ` : ''}
            <button onclick="runAutoScraperNow('${scraper.id}')" class="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition">
              ${scraper.last_run_status === 'running' ? '🔄 Forcer relance' : 'Exécuter'}
            </button>
            ${scraper.last_run_status === 'running' ? `
            <button onclick="resetScraperStatus('${scraper.id}')" class="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition">
              ⚠️ Réinitialiser
            </button>
            ` : ''}
            <button onclick="editAutoScraper('${scraper.id}')" class="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition">
              Modifier
            </button>
            <button onclick="deleteAutoScraper('${scraper.id}', '${scraper.name}')" class="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    `
  }).join('')
}

window.toggleMaxResults = function() {
  const unlimited = document.getElementById('scraper-unlimited').checked
  const maxResultsInput = document.getElementById('scraper-max-results')
  const helpText = document.getElementById('max-results-help')
  
  if (unlimited) {
    maxResultsInput.disabled = true
    maxResultsInput.value = '999999'
    maxResultsInput.classList.add('bg-gray-100', 'cursor-not-allowed')
    helpText.textContent = 'Le scraper parcourra toutes les pages jusqu\'à trouver toutes les annonces disponibles'
    helpText.classList.add('text-green-600', 'font-semibold')
  } else {
    maxResultsInput.disabled = false
    maxResultsInput.value = maxResultsInput.value === '999999' ? '1000' : maxResultsInput.value
    maxResultsInput.classList.remove('bg-gray-100', 'cursor-not-allowed')
    helpText.textContent = 'Limits the total number of listings scraped per URL (default: 1000)'
    helpText.classList.remove('text-green-600', 'font-semibold')
  }
}

window.showCreateAutoScraperModal = function() {
  document.getElementById('scraper-id').value = ''
  document.getElementById('scraper-name').value = ''
  document.getElementById('scraper-source').value = ''
  document.getElementById('scraper-urls').value = ''
  document.getElementById('scraper-cron').value = '0 */6 * * *'
  document.getElementById('scraper-unlimited').checked = false
  document.getElementById('scraper-max-results').value = '1000'
  document.getElementById('scraper-max-results').disabled = false
  document.getElementById('scraper-max-results').classList.remove('bg-gray-100', 'cursor-not-allowed')
  document.getElementById('scraper-limit-per-thread').value = '100'
  document.getElementById('scraper-enabled').checked = true
      document.getElementById('max-results-help').textContent = '💡 Scraping incrémental recommandé : Limitez à 500-1000 annonces pour scraper seulement les nouvelles annonces (coût réduit de 90%). Utilisez "Sans limite" seulement pour un scraping complet hebdomadaire.'
  document.getElementById('max-results-help').classList.remove('text-green-600', 'font-semibold')
  document.getElementById('modal-title').textContent = 'New automatic scraping'
  document.getElementById('auto-scraper-modal').classList.remove('hidden')
}

window.closeAutoScraperModal = function() {
  document.getElementById('auto-scraper-modal').classList.add('hidden')
}

window.editAutoScraper = async function(id) {
  const token = getAuthToken()
  if (!token) return

  try {
    const response = await fetch(`/api/v1/admin/auto-scrapers/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    const scraper = data.scraper

    document.getElementById('scraper-id').value = scraper.id
    document.getElementById('scraper-name').value = scraper.name
    document.getElementById('scraper-source').value = scraper.source
    document.getElementById('scraper-urls').value = scraper.search_urls.join('\n')
    document.getElementById('scraper-cron').value = scraper.schedule_cron
    
    // Handle unlimited (999999 or very high value)
    const maxResults = scraper.max_results || 1000
    const isUnlimited = maxResults >= 999999
    document.getElementById('scraper-unlimited').checked = isUnlimited
    document.getElementById('scraper-max-results').value = isUnlimited ? '999999' : maxResults
    document.getElementById('scraper-max-results').disabled = isUnlimited
    if (isUnlimited) {
      document.getElementById('scraper-max-results').classList.add('bg-gray-100', 'cursor-not-allowed')
      document.getElementById('max-results-help').textContent = 'Le scraper parcourra toutes les pages jusqu\'à trouver toutes les annonces disponibles'
      document.getElementById('max-results-help').classList.add('text-green-600', 'font-semibold')
    } else {
      document.getElementById('scraper-max-results').classList.remove('bg-gray-100', 'cursor-not-allowed')
      document.getElementById('max-results-help').textContent = '💡 Scraping incrémental recommandé : Limitez à 500-1000 annonces pour scraper seulement les nouvelles annonces (coût réduit de 90%). Utilisez "Sans limite" seulement pour un scraping complet hebdomadaire.'
      document.getElementById('max-results-help').classList.remove('text-green-600', 'font-semibold')
    }
    
    document.getElementById('scraper-limit-per-thread').value = scraper.result_limit_per_thread || '100'
    document.getElementById('scraper-enabled').checked = scraper.enabled
    document.getElementById('modal-title').textContent = 'Edit automatic scraping'
    document.getElementById('auto-scraper-modal').classList.remove('hidden')
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

window.deleteAutoScraper = async function(id, name) {
  if (!confirm(`Supprimer le scraping automatique "${name}" ?`)) return

  const token = getAuthToken()
  if (!token) return

  try {
    const response = await fetch(`/api/v1/admin/auto-scrapers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) throw new Error('Error deleting')
    
    loadAutoScrapers()
    alert('Scraping automatique supprimé')
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

window.resetScraperStatus = async function(id) {
  const token = getAuthToken()
  if (!token) return

  if (!confirm('Réinitialiser le statut de ce scraping ?\n\nCela permettra de relancer le scraping même s\'il semble bloqué.')) return

  try {
    const response = await fetch(`/api/v1/admin/auto-scrapers/${id}/reset-status`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) throw new Error('Error resetting')
    
    alert('✅ Statut réinitialisé avec succès')
    loadAutoScrapers()
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

window.resumeAutoScraperNow = async function(id) {
  const token = getAuthToken()
  if (!token) return

  let scraper
  try {
    const res = await fetch(`/api/v1/admin/auto-scrapers/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    scraper = data.scraper
  } catch (err) {
    console.error('Failed to load scraper:', err)
    alert('Failed to load scraper. Please try again.')
    return
  }

  if (!scraper) {
    alert('Error: Scraper not found')
    return
  }

  const lastResult = scraper.last_run_result || {}
  const processedUrls = lastResult.processedUrls || []
  
  if (processedUrls.length === 0) {
    alert('No URL processed previously. Use "Run" to start a new scraping.')
    return
  }

  const message = `Reprendre le scraping "${scraper.name}" ?\n\n${processedUrls.length} URL(s) déjà traitée(s) seront ignorées.\n\nLe scraping reprendra là où il s'est arrêté.`

  if (!confirm(message)) return

  // Find the scraper card to update status
  const scraperCard = event?.target?.closest('.border') || document.querySelector(`[data-scraper-id="${id}"]`)
  
  try {
    // Show running status
    if (scraperCard) {
      const statusDiv = scraperCard.querySelector('.text-sm.text-gray-600')
      if (statusDiv) {
        const originalContent = statusDiv.innerHTML
        statusDiv.innerHTML = `
          <p><strong>Planning:</strong> <code class="bg-gray-100 px-2 py-0.5 rounded text-xs">${scraperCard.dataset.cron || 'N/A'}</code></p>
          <p><strong>URLs:</strong> ${scraperCard.dataset.urlsCount || 0} URL(s)</p>
          <p><strong>Limite:</strong> ${scraperCard.dataset.maxResults >= 999999 ? '<span class="text-green-600 font-semibold">Sans limite (toutes les annonces)</span>' : `${scraperCard.dataset.maxResults || 1000} annonces max`}</p>
          <p class="text-green-600 font-semibold">🔄 Resuming...</p>
        `
      }
    }

    const response = await fetch(`/api/v1/admin/auto-scrapers/${id}/resume`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || 'Error resuming')
    }
    
    const data = await response.json()
    
    // Scraping resumed in background - the main auto-refresh in loadAutoScrapers will handle updates
    if (document.getElementById('auto-scrapers-list')) {
      loadAutoScrapers() // Initial load to show "running" status - this will start auto-refresh if needed
    }
  } catch (error) {
    alert('Error: ' + error.message)
    loadAutoScrapers() // Reload to show error status
  }
}

window.runAutoScraperNow = async function(id) {
  const token = getAuthToken()
  if (!token) return

  let scraper
  try {
    const res = await fetch(`/api/v1/admin/auto-scrapers/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    scraper = data.scraper
  } catch (err) {
    console.error('Failed to load scraper:', err)
    alert('Failed to load scraper. Please try again.')
    return
  }

  const isRunning = scraper?.last_run_status === 'running'
  const message = isRunning 
    ? 'This scraping is marked as "in progress".\n\nDo you want to force a new execution?\n\nThe status will be reset automatically.'
    : 'Exécuter ce scraping maintenant ?\n\nVous pourrez suivre la progression dans les logs du serveur.'

  if (!confirm(message)) return

  // Find the scraper card to update status
  const scraperCard = event?.target?.closest('.border') || document.querySelector(`[data-scraper-id="${id}"]`)
  
  try {
    // Show running status
    if (scraperCard) {
      const statusDiv = scraperCard.querySelector('.text-sm.text-gray-600')
      if (statusDiv) {
        const originalContent = statusDiv.innerHTML
        statusDiv.innerHTML = `
          <p><strong>Planning:</strong> <code class="bg-gray-100 px-2 py-0.5 rounded text-xs">${scraperCard.dataset.cron || 'N/A'}</code></p>
          <p><strong>URLs:</strong> ${scraperCard.dataset.urlsCount || 0} URL(s)</p>
          <p><strong>Limite:</strong> ${scraperCard.dataset.maxResults >= 999999 ? '<span class="text-green-600 font-semibold">Sans limite (toutes les annonces)</span>' : `${scraperCard.dataset.maxResults || 1000} annonces max`}</p>
          <p class="text-blue-600 font-semibold">⏳ Scraping in progress...</p>
        `
      }
    }

    const response = await fetch(`/api/v1/admin/auto-scrapers/${id}/run?force=true`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) throw new Error('Error executing')
    
    const data = await response.json()
    
    // Scraping started in background - the main auto-refresh in loadAutoScrapers will handle updates
    // No need for separate polling here as it would conflict with the main auto-refresh
    if (document.getElementById('auto-scrapers-list')) {
      loadAutoScrapers() // Initial load to show "running" status - this will start auto-refresh if needed
    }
  } catch (error) {
    alert('Error: ' + error.message)
    loadAutoScrapers() // Reload to show error status
  }
}

// Handle form submission - Use event delegation on document
document.addEventListener('submit', async (e) => {
  // Only handle if it's the auto-scraper form
  if (e.target && e.target.id === 'auto-scraper-form') {
    e.preventDefault()
    
    console.log('📝 Formulaire soumis')
    
    const token = getAuthToken()
    if (!token) {
      console.error('❌ Pas de token trouvé')
      alert('Vous devez être connecté')
      return
    }

    const id = document.getElementById('scraper-id')?.value || ''
    const name = document.getElementById('scraper-name')?.value || ''
    const source = document.getElementById('scraper-source')?.value || ''
    const urlsText = document.getElementById('scraper-urls')?.value || ''
    const urls = urlsText.split('\n').filter(url => url.trim())
    
    console.log('📋 Données du formulaire:', {
      id: id || 'nouveau',
      name,
      source,
      urlsCount: urls.length,
      urls: urls.slice(0, 2) // Afficher seulement les 2 premières
    })

    // Validation
    if (!name || !source || urls.length === 0) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const data = {
      name,
      source,
      search_urls: urls,
      schedule_cron: document.getElementById('scraper-cron')?.value || '0 */6 * * *',
      max_results: parseInt(document.getElementById('scraper-max-results')?.value) || 1000,
      result_limit_per_thread: parseInt(document.getElementById('scraper-limit-per-thread')?.value) || 100,
      enabled: document.getElementById('scraper-enabled')?.checked !== false
    }

    console.log('📤 Envoi des données:', {
      ...data,
      search_urls: data.search_urls.slice(0, 2) // Afficher seulement les 2 premières URLs
    })

    try {
      const url = id 
        ? `/api/v1/admin/auto-scrapers/${id}`
        : '/api/v1/admin/auto-scrapers'
      const method = id ? 'PATCH' : 'POST'

      console.log(`📡 ${method} ${url}`)

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      console.log('📊 Réponse:', response.status, response.statusText)

      const responseData = await response.json()
      console.log('📦 Données de réponse:', responseData)

      if (!response.ok) {
        console.error('❌ API Error:', responseData)
        throw new Error(responseData.error?.message || `Error ${response.status}: ${response.statusText}`)
      }
      
      console.log('✅ Scraping enregistré avec succès!')
      closeAutoScraperModal()
      loadAutoScrapers()
      alert('✅ Scraping automatique enregistré avec succès')
    } catch (error) {
      console.error('❌ Error saving:', error)
      alert('Error: ' + error.message)
    }
  }
})

// Mobile menu toggle function
window.toggleMobileMenu = function() {
  const mobileMenu = document.getElementById('mobile-menu')
  const menuIcon = document.getElementById('menu-icon')
  const closeIcon = document.getElementById('close-icon')
  
  if (mobileMenu && menuIcon && closeIcon) {
    const isHidden = mobileMenu.classList.contains('hidden')
    if (isHidden) {
      mobileMenu.classList.remove('hidden')
      menuIcon.classList.add('hidden')
      closeIcon.classList.remove('hidden')
    } else {
      mobileMenu.classList.add('hidden')
      menuIcon.classList.remove('hidden')
      closeIcon.classList.add('hidden')
    }
  }
}

// Close mobile menu when clicking on a link
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuLinks = document.querySelectorAll('#mobile-menu a')
  mobileMenuLinks.forEach(link => {
    link.addEventListener('click', () => {
      window.toggleMobileMenu()
    })
  })
})

// Refresh button
setTimeout(() => {
  const refreshBtn = document.getElementById('refresh-users')
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadUsers(currentUsersPage))
  }
}, 100)

