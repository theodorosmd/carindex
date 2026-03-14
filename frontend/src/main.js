import './styles/globals.css'
import { getLang, tr } from './utils/i18n.js'
import { renderLandingPage } from './pages/landing'
import { renderListingsSearch } from './pages/listings-search'
import { renderListingDetails } from './pages/listing-details'
import { renderLogin } from './pages/auth-login'
import { renderSignup } from './pages/auth-signup'
import { renderDashboard } from './pages/dashboard'
import { renderAdminDashboard, cleanupAdminDashboard } from './pages/admin-dashboard'
import { renderStockAnalysis } from './pages/stock-analysis'
import { renderAuctionMarginCalculator } from './pages/auction-margin-calculator'
import { renderEvaluationsManager } from './pages/evaluations-manager'
import { renderEvaluationsCompare } from './pages/evaluations-compare'
import { renderEvaluationDetails } from './pages/evaluation-details'
import { renderMarketInsights } from './pages/market-insights'
import { renderArbitrage } from './pages/arbitrage'
import { renderBatchEvaluations } from './pages/batch-evaluations'
import { renderDealScore } from './pages/deal-score'
import { renderOwnershipCost } from './pages/ownership-cost'

// Auth utility functions
export function getAuthToken() {
  return localStorage.getItem('carindex_token')
}

export function getUser() {
  const userStr = localStorage.getItem('carindex_user')
  return userStr ? JSON.parse(userStr) : null
}

export function isAdmin() {
  const user = getUser()
  return user && user.role === 'admin'
}

export function isAuthenticated() {
  return !!getAuthToken()
}

export function logout() {
  localStorage.removeItem('carindex_token')
  localStorage.removeItem('carindex_user')
  window.location.href = '/login'
}

// Simple routing function
function route() {
  try {
    const path = window.location.pathname
    const hash = window.location.hash

    // When a hash is present, use hash-based routing exclusively
    // to avoid path-based checks intercepting hash routes
    const effectivePath = hash ? null : path

    const isAdminRoute = hash === '#/admin' || hash === '#/dashboard/admin' || effectivePath === '/admin' || (effectivePath && effectivePath.startsWith('/admin'))
    if (!isAdminRoute) {
      cleanupAdminDashboard()
    }

    // Deal score page (public)
  if (hash === '#/deal-score' || effectivePath === '/deal-score') {
    renderDealScore()
    return
  }

  // Ownership cost estimator (public)
  if (hash === '#/ownership-cost' || effectivePath === '/ownership-cost') {
    renderOwnershipCost()
    return
  }

  // Auth routes (public) - use startsWith to match #/login?redirect=...
  if (hash === '#/login' || hash?.startsWith('#/login?') || effectivePath === '/login' || (effectivePath && effectivePath.startsWith('/login'))) {
    renderLogin()
    return
  }
  
  if (hash === '#/signup' || effectivePath === '/signup') {
    renderSignup()
    return
  }
  
  // Admin dashboard route (protected, admin only)
  if (hash === '#/admin' || hash === '#/dashboard/admin' || effectivePath === '/admin' || effectivePath === '/dashboard/admin') {
    if (!isAuthenticated()) {
      const redirectPath = hash || path
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(redirectPath))
      renderLogin()
      return
    }
    renderAdminDashboard()
    return
  }
  
  // Dashboard route (protected)
  if (hash === '#/dashboard' || effectivePath === '/dashboard') {
    if (!isAuthenticated()) {
      const redirectPath = hash || path
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(redirectPath))
      renderLogin()
      return
    }
    // Check if user is admin before rendering dashboard
    // This will redirect to admin dashboard if needed
    renderDashboard()
    return
  }
  
  // Stock analysis route (protected)
  if (hash === '#/stock-analysis' || effectivePath === '/stock-analysis') {
    if (!isAuthenticated()) {
      const redirectPath = hash || path
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(redirectPath))
      renderLogin()
      return
    }
    renderStockAnalysis()
    return
  }
  
  // Market insights route (protected)
  if (hash === '#/market-insights' || hash === '#/insights' || effectivePath === '/market-insights' || effectivePath === '/insights') {
    if (!isAuthenticated()) {
      const redirectPath = hash || path
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(redirectPath))
      renderLogin()
      return
    }
    renderMarketInsights()
    return
  }

  // Arbitrage véhicule route (protected)
  if (hash === '#/arbitrage' || effectivePath === '/arbitrage') {
    if (!isAuthenticated()) {
      const redirectPath = hash || path
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(redirectPath))
      renderLogin()
      return
    }
    renderArbitrage()
    return
  }
  
  // Auction margin calculator route (protected)
  // Support both hash routing (#/auction-margin) and pathname routing (/auction-margin-calculator)
  if (hash === '#/auction-margin' || effectivePath === '/auction-margin-calculator' || effectivePath === '/auction-margin') {
    if (!isAuthenticated()) {
      const redirectPath = hash || path
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(redirectPath))
      renderLogin()
      return
    }
    renderAuctionMarginCalculator()
    return
  }

  // Batch evaluations route (protected)
  if (hash === '#/batch-evaluations' || effectivePath === '/batch-evaluations') {
    if (!isAuthenticated()) {
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(hash || path))
      renderLogin()
      return
    }
    try {
      renderBatchEvaluations()
    } catch (error) {
      console.error('Error rendering batch evaluations:', error)
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
    return
  }

  // Evaluations manager route (protected)
  if (hash === '#/evaluations' || effectivePath === '/evaluations' || hash === '#/evaluations-manager' || effectivePath === '/evaluations-manager') {
    if (!isAuthenticated()) {
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(hash || path))
      renderLogin()
      return
    }
    try {
      renderEvaluationsManager()
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
    return
  }

  // Evaluation details route (protected)
  if (hash.match(/#\/evaluations\/[^/]+$/) && !hash.startsWith('#/evaluations/compare')) {
    if (!isAuthenticated()) {
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(hash || path))
      renderLogin()
      return
    }
    renderEvaluationDetails()
    return
  }

  // Evaluation comparison route (protected)
  if (hash.startsWith('#/evaluations/compare') || (effectivePath && effectivePath.startsWith('/evaluations/compare'))) {
    if (!isAuthenticated()) {
      window.history.pushState({}, '', '/login?redirect=' + encodeURIComponent(hash || path))
      renderLogin()
      return
    }
    renderEvaluationsCompare()
    return
  }
  
  // Protected routes - check authentication
  const protectedRoutes = []
  const isProtectedRoute = protectedRoutes.some(route => hash.startsWith(route))
  
  if (isProtectedRoute && !isAuthenticated()) {
    window.location.hash = '#/login?redirect=' + encodeURIComponent(hash)
    renderLogin()
    return
  }
  
  // Check for listing details page
  if ((effectivePath && effectivePath.startsWith('/listing/')) || hash.startsWith('#/listing/')) {
    renderListingDetails()
    return
  }
  
  // Check hash first (for client-side routing)
  if (hash === '#/search' || hash === '#/listings' || hash.startsWith('#/search')) {
    renderListingsSearch()
    // Restore filters from URL if present
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (params.toString()) {
        restoreFiltersFromURL(params)
      }
    }, 300)
    return
  }
  
  // Check pathname (only when no hash is present)
  if (effectivePath === '/search' || effectivePath === '/listings' || (effectivePath && effectivePath.includes('search'))) {
    renderListingsSearch()
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (params.toString()) {
        restoreFiltersFromURL(params)
      }
    }, 300)
  } else if (effectivePath === '/auction-margin-calculator') {
    if (!isAuthenticated()) {
      window.location.hash = '#/login?redirect=' + encodeURIComponent(path)
      renderLogin()
      return
    }
    renderAuctionMarginCalculator()
  } else if (effectivePath === '/' || effectivePath === '/index.html' || effectivePath === '') {
    // Redirect bare / to #/ so hash routing takes over
    if (!window.location.hash) {
      window.location.replace('/#/')
      return
    }
    renderLandingPage()
  } else {
    // Default to landing page
    renderLandingPage()
  }
  } catch (error) {
    console.error('Route error:', error)
    showGlobalError(error.message || 'Failed to load page.')
  }
}

document.documentElement.lang = getLang()

function showGlobalError(message) {
  const app = document.getElementById('app')
  if (app) {
    app.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div class="max-w-md text-center">
          <h1 class="text-xl font-bold text-red-600 mb-4">${tr('Something went wrong', 'Une erreur est survenue')}</h1>
          <p class="text-gray-600 mb-4">${message}</p>
          <a href="/" class="text-blue-600 hover:underline">${tr('Back to home', 'Retour à l\'accueil')}</a>
        </div>
      </div>
    `
  }
}

window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.error || e.message)
  showGlobalError(e.message || 'An unexpected error occurred.')
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason)
})

function restoreFiltersFromURL(params) {
  // Restore search query
  const query = params.get('query')
  if (query) {
    const searchInput = document.getElementById('search-query')
    if (searchInput) searchInput.value = query
  }
  
  // Restore checkboxes
  const checkboxGroups = ['brand', 'model', 'fuel', 'steering', 'transmission', 'doors', 'seller-type']
  checkboxGroups.forEach(group => {
    const values = params.getAll(group)
    values.forEach(value => {
      const checkbox = document.querySelector(`input[name="${group}"][value="${value}"]`)
      if (checkbox) checkbox.checked = true
    })
  })
  
  // Restore country
  const country = params.get('country')
  if (country) {
    const countrySelect = document.getElementById('country-filter')
    if (countrySelect) countrySelect.value = country
  }
  
  // Restore ranges
  const ranges = {
    'min_price': 'price-from',
    'max_price': 'price-to',
    'min_mileage': 'mileage-from',
    'max_mileage': 'mileage-to',
    'min_year': 'year-from',
    'max_year': 'year-to'
  }
  Object.entries(ranges).forEach(([param, inputId]) => {
    const value = params.get(param)
    if (value) {
      const input = document.getElementById(inputId)
      if (input) {
        input.value = value
        // Sync with range slider
        const rangeId = inputId.replace('-from', '-min').replace('-to', '-max')
        const range = document.getElementById(rangeId)
        if (range) range.value = value
      }
    }
  })
  
  // Restore color
  const color = params.get('color')
  if (color) {
    const colorBtn = document.querySelector(`button[data-color="${color}"]`)
    if (colorBtn) {
      document.querySelectorAll('button[data-color]').forEach(btn => {
        btn.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500')
        btn.classList.add('border-gray-300')
      })
      colorBtn.classList.remove('border-gray-300')
      colorBtn.classList.add('border-blue-500', 'ring-2', 'ring-blue-500')
    }
  }
  
  // Restore sort
  const sort = params.get('sort')
  if (sort) {
    const sortSelect = document.getElementById('sort-by')
    if (sortSelect) sortSelect.value = sort
  }
  
  // Trigger search if filters were restored
  if (params.toString() && window.searchListings && window.getFilters) {
    setTimeout(() => {
      const filters = window.getFilters()
      window.searchListings(filters, 1)
    }, 100)
  }
}

// Handle initial load
route()

// Safe back navigation with fallback
window.safeBack = (fallback = '/') => {
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.location.href = fallback
}

// Handle browser back/forward
window.addEventListener('popstate', route)

// Handle hash changes
window.addEventListener('hashchange', route)

// Make navigation links work with routing
document.addEventListener('click', (e) => {
  const link = e.target.closest('a')
  if (link) {
    if (link.target === '_blank') return
    const href = link.getAttribute('href')
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return
    }
    if (href.startsWith('/')) {
      e.preventDefault()
      window.history.pushState({}, '', href)
      route()
      return
    }
    if (!href.startsWith('#')) {
      return
    }
    e.preventDefault()
    const hash = href
    
    // Handle all hash routes
    if (hash === '#/search' || hash === '#/listings') {
      window.history.pushState({}, '', '/search')
      route()
    } else if (hash === '#/deal-score') {
      window.history.pushState({}, '', '/deal-score')
      route()
    } else if (hash === '#/ownership-cost') {
      window.history.pushState({}, '', '/ownership-cost')
      route()
    } else if (hash === '#/login' || hash === '#/signup' || hash === '#/dashboard' || hash === '#/admin' || hash === '#/dashboard/admin' || hash === '#/stock-analysis' || hash === '#/auction-margin' || hash.startsWith('#/listing/')) {
      // Auth routes, dashboard, admin, stock analysis, and listing details
      const nextPath = hash.replace('#', '')
      window.history.pushState({}, '', nextPath)
      route()
    } else if (hash === '#/' || hash === '#') {
      window.history.pushState({}, '', '/')
      route()
    } else {
      // For any other hash, just update the hash and route
      window.location.hash = hash
      route()
    }
  }
})

