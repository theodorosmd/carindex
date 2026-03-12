import { getAuthToken } from '../main.js';
import { tr, renderLanguageToggle, attachLanguageToggle, getLang, formatNumber, formatCurrency, capitalize } from '../utils/i18n.js';

export function renderMarketInsights() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div class="container mx-auto px-4 sm:px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <a href="#/" class="flex items-center space-x-2">
              <span class="text-xl sm:text-2xl font-bold text-blue-600">Carindex</span>
            </a>
            <h1 class="text-lg sm:text-xl font-semibold text-gray-900">${tr('Market Insights', 'Market Insights')}</h1>
          </div>
          <nav class="flex items-center space-x-4">
            ${renderLanguageToggle()}
            <a href="#/dashboard" class="text-gray-600 hover:text-blue-600 transition">${tr('Dashboard', 'Dashboard')}</a>
            <a href="#/search" class="text-gray-600 hover:text-blue-600 transition">${tr('Search', 'Recherche')}</a>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="container mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <div id="loading-state" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">${tr('Loading insights...', 'Chargement des insights...')}</p>
      </div>

      <!-- Error State -->
      <div id="error-state" class="hidden text-center py-12">
        <p class="text-red-600" id="error-message"></p>
        <button onclick="loadMarketInsights()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          ${tr('Retry', 'Réessayer')}
        </button>
      </div>

      <!-- Content -->
      <div id="content" class="hidden">
        <!-- Intelligent Recommendations -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">💡 ${tr('Intelligent Recommendations', 'Recommandations Intelligentes')}</h2>
            <select id="recommendations-type" onchange="loadRecommendations()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">${tr('All', 'Toutes')}</option>
              <option value="underrated">${tr('Underrated', 'Sous-évalués')}</option>
              <option value="fast_rising">${tr('Rising', 'En progression')}</option>
              <option value="opportunity">${tr('Opportunities', 'Opportunités')}</option>
            </select>
          </div>
          <div id="recommendations-content">
            <p class="text-gray-500 text-center py-8">${tr('Loading recommendations...', 'Chargement des recommandations...')}</p>
          </div>
        </div>

        <!-- Competition Analysis -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">📊 ${tr('Competition Analysis', 'Analyse de Concurrence')}</h2>
            <div class="flex items-center space-x-2">
              <input type="text" id="competition-brand" placeholder="${tr('Brand', 'Marque')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <input type="text" id="competition-model" placeholder="${tr('Model', 'Modèle')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <input type="number" id="competition-year" placeholder="${tr('Year', 'Année')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-24">
              <button onclick="loadCompetitionAnalysis()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                ${tr('Analyze', 'Analyser')}
              </button>
            </div>
          </div>
          <div id="competition-content">
            <p class="text-gray-500 text-center py-8">${tr('Enter a brand and model to analyze competition', 'Entrez une marque et un modèle pour analyser la concurrence')}</p>
          </div>
        </div>

        <!-- Watchlist -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">⭐ ${tr('My Watchlist', 'Ma Watchlist')}</h2>
            <button onclick="showAddWatchlistModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              + ${tr('Add a model', 'Ajouter un modèle')}
            </button>
          </div>
          <div id="watchlist-content">
            <p class="text-gray-500 text-center py-8">${tr('Loading your watchlist...', 'Chargement de votre watchlist...')}</p>
          </div>
        </div>

        <!-- Fastest Selling Models -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <h2 class="text-2xl font-bold text-gray-900">${tr('Fastest Selling Models', 'Modèles qui se Vendent le Plus Vite')}</h2>
            <div class="flex flex-wrap items-center gap-2">
              <select id="period-select" onchange="loadFastestSellingModels()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="7">${tr('7 days', '7 jours')}</option>
                <option value="30" selected>${tr('30 days', '30 jours')}</option>
                <option value="90">${tr('90 days', '90 jours')}</option>
              </select>
              <select id="country-filter" onchange="loadFastestSellingModels()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">${tr('All countries', 'Tous pays')}</option>
                <!-- Will be populated by JS -->
              </select>
              <select id="year-filter" onchange="loadFastestSellingModels()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">${tr('All years', 'Toutes années')}</option>
                <!-- Will be populated by JS -->
              </select>
              <select id="brand-filter" onchange="loadFastestSellingModels()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">${tr('All brands', 'Toutes marques')}</option>
                <!-- Will be populated by JS -->
              </select>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200" id="fastest-selling-table">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Model', 'Modèle')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Country', 'Pays')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Sales', 'Ventes')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Avg DOM', 'DOM Moyen')} ⚡</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Median Price', 'Prix Médian')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Velocity/month', 'Vélocité/mois')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody id="fastest-selling-body" class="bg-white divide-y divide-gray-200">
                <!-- Will be populated by JS -->
              </tbody>
            </table>
          </div>
          <p class="mt-4 text-sm text-gray-500">
            ⚡ DOM = ${tr('Days On Market (days on the market). The lower the DOM, the faster the model sells.', 'Days On Market (jours sur le marché). Plus le DOM est bas, plus le modèle se vend vite.')}
            ${tr('"< 1 day" = same-day sale or listing tracked for less than 1 day.', '"< 1 jour" = vente le jour même ou annonce suivie moins d\'1 jour.')}
          </p>
        </div>

        <!-- Price Drops -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">${tr('Top Price Drops', 'Top Baisses de Prix')}</h2>
          <div class="flex space-x-4 mb-4">
            <button onclick="loadPriceDrops('day')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              ${tr('Today', 'Aujourd\'hui')}
            </button>
            <button onclick="loadPriceDrops('week')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              ${tr('This week', 'Cette semaine')}
            </button>
            <button onclick="loadPriceDrops('month')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              ${tr('This month', 'Ce mois')}
            </button>
          </div>
          <div id="price-drops-content">
            <!-- Will be populated by JS -->
          </div>
        </div>

        <!-- Statistics by Country -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">${tr('Statistics by Country', 'Statistiques par Pays')}</h2>
            <select id="country-stats-period" onchange="loadStatsByCountry()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="7">${tr('7 days', '7 jours')}</option>
              <option value="30" selected>${tr('30 days', '30 jours')}</option>
              <option value="90">${tr('90 days', '90 jours')}</option>
            </select>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">${tr('Sales by Country', 'Ventes par Pays')}</h3>
              <canvas id="sales-by-country-chart"></canvas>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">${tr('Average DOM by Country', 'DOM Moyen par Pays')}</h3>
              <canvas id="dom-by-country-chart"></canvas>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Country', 'Pays')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Sales', 'Ventes')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Unique Models', 'Modèles Uniques')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Avg DOM', 'DOM Moyen')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Median Price', 'Prix Médian')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Velocity/month', 'Vélocité/mois')}</th>
                </tr>
              </thead>
              <tbody id="country-stats-body" class="bg-white divide-y divide-gray-200">
                <!-- Will be populated by JS -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Model Comparison -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">${tr('Model Comparison', 'Comparaison de Modèles')}</h2>
            <button onclick="showCompareModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              + ${tr('Compare models', 'Comparer des modèles')}
            </button>
          </div>
          <div id="compare-models-content">
            <p class="text-gray-500 text-center py-8">${tr('Select 2 to 5 models to compare', 'Sélectionnez 2 à 5 modèles à comparer')}</p>
          </div>
        </div>

        <!-- Model Trends -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">${tr('Time Trends', 'Tendances Temporelles')}</h2>
            <div class="flex items-center space-x-2">
              <input type="text" id="trends-brand" placeholder="${tr('Brand', 'Marque')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <input type="text" id="trends-model" placeholder="${tr('Model', 'Modèle')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <input type="number" id="trends-year" placeholder="${tr('Year (optional)', 'Année (optionnel)')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-24">
              <select id="trends-months" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="6">${tr('6 months', '6 mois')}</option>
                <option value="12" selected>${tr('12 months', '12 mois')}</option>
              </select>
              <button onclick="loadModelTrends()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                ${tr('Analyze', 'Analyser')}
              </button>
            </div>
          </div>
          <div id="trends-content">
            <p class="text-gray-500 text-center py-8">${tr('Enter a brand and model to see trends', 'Entrez une marque et un modèle pour voir les tendances')}</p>
          </div>
        </div>

        <!-- Profitability Analysis -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">${tr('Profitability Analysis', 'Analyse de Rentabilité')}</h2>
            <div class="flex items-center space-x-2">
              <select id="profitability-country" onchange="loadProfitability()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">${tr('All countries', 'Tous pays')}</option>
                <!-- Will be populated by JS -->
              </select>
              <select id="profitability-days" onchange="loadProfitability()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="30">${tr('30 days', '30 jours')}</option>
                <option value="90" selected>${tr('90 days', '90 jours')}</option>
                <option value="180">${tr('180 days', '180 jours')}</option>
              </select>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Model', 'Modèle')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Sales', 'Ventes')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Avg Profit', 'Profit Moyen')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Avg ROI', 'ROI Moyen')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Avg Margin', 'Marge Moyenne')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Profit/Day', 'Profit/Jour')}</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${tr('Avg DOM', 'DOM Moyen')}</th>
                </tr>
              </thead>
              <tbody id="profitability-body" class="bg-white divide-y divide-gray-200">
                <tr>
                  <td colspan="7" class="px-4 py-8 text-center text-gray-500">${tr('Loading...', 'Chargement...')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Predictions -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">🔮 ${tr('Predictions & Deal Score', 'Prédictions & Score d\'Affaire')}</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input type="text" id="predict-brand" placeholder="${tr('Brand', 'Marque')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <input type="text" id="predict-model" placeholder="${tr('Model', 'Modèle')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <input type="number" id="predict-year" placeholder="${tr('Year (optional)', 'Année (optionnel)')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input type="number" id="predict-price" placeholder="${tr('Current price (EUR)', 'Prix actuel (EUR)')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <input type="number" id="predict-dom" placeholder="${tr('Current DOM (days)', 'DOM actuel (jours)')}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          </div>
          <button onclick="loadPredictions()" class="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            ${tr('Calculate predictions', 'Calculer les prédictions')}
          </button>
          <div id="predictions-content" class="mt-6">
            <p class="text-gray-500 text-center py-8">${tr('Fill in the fields above to get predictions', 'Remplissez les champs ci-dessus pour obtenir des prédictions')}</p>
          </div>
        </div>

        <!-- Hot Deals -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">${tr('Hot Deals (Undervalued)', 'Hot Deals (Sous-évalués)')}</h2>
            <button onclick="exportData('csv')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              📥 ${tr('Export CSV', 'Exporter CSV')}
            </button>
          </div>
          <div id="hot-deals-content">
            <!-- Will be populated by JS -->
          </div>
        </div>

        <!-- Global Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${tr('Listings this week', 'Annonces cette semaine')}</h3>
            <p class="text-3xl font-bold text-blue-600" id="new-listings-count">-</p>
          </div>
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${tr('Sold', 'Vendues')}</h3>
            <p class="text-3xl font-bold text-green-600" id="sold-listings-count">-</p>
          </div>
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">${tr('Average price', 'Prix moyen')}</h3>
            <p class="text-3xl font-bold text-purple-600" id="avg-price">-</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach language toggle handler
  attachLanguageToggle(() => {
    // Reload page when language changes
    window.location.reload()
  })
  
  // Make functions available globally
  window.loadMarketInsights = loadMarketInsights;
  window.loadPriceDrops = loadPriceDrops;
  window.loadFastestSellingModels = loadFastestSellingModels;
  window.loadStatsByCountry = loadStatsByCountry;
  window.exportData = exportData;
  window.showCompareModal = showCompareModal;
  window.loadModelTrends = loadModelTrends;
  window.loadProfitability = loadProfitability;
  window.createFastModelAlert = createFastModelAlert;
  window.showCreateAlertModal = showCreateAlertModal;
  window.loadRecommendations = loadRecommendations;
  window.loadCompetitionAnalysis = loadCompetitionAnalysis;
  window.showAddWatchlistModal = showAddWatchlistModal;
  window.loadWatchlist = loadWatchlist;
  window.addToWatchlistFromRecommendation = addToWatchlistFromRecommendation;
  window.removeFromWatchlist = removeFromWatchlist;
  window.viewWatchlistHistory = viewWatchlistHistory;
  window.submitWatchlist = submitWatchlist;
  window.closeWatchlistModal = closeWatchlistModal;
  window.loadPredictions = loadPredictions;

  // Load filter options and data
  loadFilterOptions().then(() => {
    loadMarketInsights();
    loadFastestSellingModels();
    loadStatsByCountry();
    loadProfitability();
    loadRecommendations();
    loadWatchlist();
    // Populate profitability country filter
    const profitabilityCountry = document.getElementById('profitability-country');
    if (profitabilityCountry) {
      fetch('/api/v1/analytics/filter-options', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.options?.countries) {
            profitabilityCountry.innerHTML = '<option value="">' + tr('All countries', 'Tous pays') + '</option>' + 
              data.options.countries.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
          }
        });
    }
  });
}

async function loadFilterOptions() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch('/api/v1/analytics/filter-options', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.warn('Could not load filter options');
      return;
    }

    const data = await response.json();
    const options = data.options || {};

    // Populate brand filter
    const brandFilter = document.getElementById('brand-filter');
    if (brandFilter && options.brands) {
      brandFilter.innerHTML = '<option value="">' + tr('All brands', 'Toutes marques') + '</option>' + 
        options.brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
    }

    // Populate country filter
    const countryFilter = document.getElementById('country-filter');
    if (countryFilter && options.countries) {
      countryFilter.innerHTML = '<option value="">' + tr('All countries', 'Tous pays') + '</option>' + 
        options.countries.map(country => 
          `<option value="${country.code}">${country.name}</option>`
        ).join('');
    }

    // Populate year filter
    const yearFilter = document.getElementById('year-filter');
    if (yearFilter && options.years) {
      yearFilter.innerHTML = '<option value="">' + tr('All years', 'Toutes années') + '</option>' + 
        options.years.map(year => `<option value="${year}">${year}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading filter options:', error);
  }
}

async function loadMarketInsights() {
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const content = document.getElementById('content');
  const errorMessage = document.getElementById('error-message');

  try {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    content.classList.add('hidden');

    const token = getAuthToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    // Load top selling models
    const analyticsResponse = await fetch('/api/v1/analytics/market-analytics', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!analyticsResponse.ok) {
      throw new Error('Erreur lors du chargement des analytics');
    }

    const analytics = await analyticsResponse.json();
    const topModels = analytics.analytics?.topSellingModels || [];

    // Load hot deals
    const dealsResponse = await fetch('/api/v1/undervalued-listings?threshold=10&dom_min=60&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (dealsResponse.ok) {
      const deals = await dealsResponse.json();
      const dealsContent = document.getElementById('hot-deals-content');
      dealsContent.innerHTML = deals.listings?.map(listing => `
        <div class="border border-gray-200 rounded-lg p-4 mb-4">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-semibold text-gray-900">${capitalize(listing.brand)} ${capitalize(listing.model)} ${listing.year || ''}</h4>
              <p class="text-lg font-bold text-blue-600">${formatCurrency(listing.price || 0)}</p>
              <p class="text-sm text-gray-600">DOM: ${listing.dom_days} jours | Baisse: -${listing.price_drop_pct?.toFixed(1)}%</p>
            </div>
            <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
              Hot Deal
            </span>
          </div>
        </div>
      `).join('') || '<p class="text-gray-500">Aucun hot deal disponible</p>';
    }

    // Load price drops (default: week)
    await loadPriceDrops('week');

    // Load global stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // This would require additional API endpoints for global stats
    // For now, we'll leave placeholders
    document.getElementById('new-listings-count').textContent = '-';
    document.getElementById('sold-listings-count').textContent = '-';
    document.getElementById('avg-price').textContent = '-';

    loadingState.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (error) {
    console.error('Error loading market insights:', error);
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorMessage.textContent = error.message || 'Erreur lors du chargement';
  }
}

async function loadFastestSellingModels() {
  const token = getAuthToken();
  if (!token) return;

  const periodSelect = document.getElementById('period-select');
  const brandFilter = document.getElementById('brand-filter');
  const countryFilter = document.getElementById('country-filter');
  const yearFilter = document.getElementById('year-filter');
  
  const days = periodSelect ? parseInt(periodSelect.value) : 30;
  const brand = brandFilter ? brandFilter.value : null;
  const country = countryFilter ? countryFilter.value : null;
  const year = yearFilter ? yearFilter.value : null;

  const tbody = document.getElementById('fastest-selling-body');
  if (!tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">Chargement...</td></tr>';

    const params = new URLSearchParams({ limit: '20', days: days.toString() });
    if (brand) {
      params.append('brand', brand);
    }
    if (country) {
      params.append('country', country);
    }
    if (year) {
      params.append('year', year);
    }

    const response = await fetch(`/api/v1/analytics/fastest-selling-models?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des modèles');
    }

    const data = await response.json();
    let models = data.models || [];

    if (models.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">Aucun modèle trouvé pour cette période</td></tr>';
      return;
    }

    // Sort by velocity/month (primary), then DOM, then sales - ensures correct ranking regardless of backend
    models = [...models].sort((a, b) => {
      const velA = Number(a.velocityPerMonth) ?? 0;
      const velB = Number(b.velocityPerMonth) ?? 0;
      const velDiff = velB - velA;
      if (velDiff !== 0) return velDiff;
      const domDiff = (a.averageDOM ?? 0) - (b.averageDOM ?? 0);
      if (domDiff !== 0) return domDiff;
      return (b.salesCount ?? 0) - (a.salesCount ?? 0);
    }).map((model, index) => ({ ...model, rank: index + 1 }));

    // Country names mapping
    const countryNames = {
      'FR': 'France',
      'SE': 'Suède',
      'DE': 'Allemagne',
      'IT': 'Italie',
      'ES': 'Espagne',
      'NL': 'Pays-Bas',
      'BE': 'Belgique',
      'AT': 'Autriche',
      'CH': 'Suisse',
      'GB': 'Royaume-Uni',
      'US': 'États-Unis',
      'CA': 'Canada'
    };

    // Render models with ranking and color coding for DOM
    tbody.innerHTML = models.map(model => {
      // Color code DOM: green for fast (< 20 days), yellow for medium (20-40), red for slow (> 40)
      let domColor = 'text-gray-600';
      let domBg = 'bg-gray-100';
      if (model.averageDOM < 20) {
        domColor = 'text-green-700';
        domBg = 'bg-green-100';
      } else if (model.averageDOM < 40) {
        domColor = 'text-yellow-700';
        domBg = 'bg-yellow-100';
      } else {
        domColor = 'text-red-700';
        domBg = 'bg-red-100';
      }

      // Format countries
      const countriesDisplay = model.countries && model.countries.length > 0
        ? model.countries.map(c => countryNames[c] || c).join(', ')
        : '-';

      return `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3 text-sm font-bold text-gray-900">
            ${model.rank <= 3 ? `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${model.rank === 1 ? 'bg-yellow-400' : model.rank === 2 ? 'bg-gray-300' : 'bg-orange-300'} text-white text-xs font-bold">${model.rank}</span>` : `#${model.rank}`}
          </td>
          <td class="px-4 py-3 text-sm font-medium text-gray-900">
            <div class="flex flex-col">
              <span class="font-semibold">${capitalize(model.brand)} ${capitalize(model.model)}</span>
              ${model.year && model.year !== 2000 ? `<span class="text-xs text-gray-500">${model.year}</span>` : ''}
              ${model.variant ? `<span class="text-xs text-gray-600 mt-0.5">${model.variant}</span>` : ''}
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-gray-600">
            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">${countriesDisplay}</span>
          </td>
          <td class="px-4 py-3 text-sm text-gray-600">${model.salesCount}</td>
          <td class="px-4 py-3 text-sm">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${domBg} ${domColor}" title="${model.averageDOM === 0 ? tr('Same-day sale or listing tracked for less than 1 day', 'Vente le jour même ou annonce suivie moins d\'1 jour') : ''}">
              ⚡ ${model.averageDOM === 0 ? '< 1 jour' : model.averageDOM + ' jours'}
            </span>
          </td>
          <td class="px-4 py-3 text-sm text-gray-600">${formatCurrency(model.medianPrice || 0)}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${model.velocityPerMonth.toFixed(1)}/mois</td>
          <td class="px-4 py-3 text-sm">
            <button onclick="showCreateAlertModal('${model.brand}', '${model.model}', ${model.year || 'null'})" 
                    class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
              🔔 Alerte
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading fastest selling models:', error);
    tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-red-500">Erreur: ${error.message}</td></tr>`;
  }
}

async function loadPriceDrops(period = 'week') {
  const token = getAuthToken();
  if (!token) return;

  const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  
  try {
    // Get price drops (this would need to be aggregated by model or listing)
    // For now, we'll show a placeholder
    const content = document.getElementById('price-drops-content');
    content.innerHTML = `
      <p class="text-gray-500">Chargement des baisses de prix pour les ${days} derniers jours...</p>
    `;
    
    // TODO: Implement API call to get aggregated price drops
    // This would require a new endpoint or modification of existing one
  } catch (error) {
    console.error('Error loading price drops:', error);
  }
}

async function loadStatsByCountry() {
  const token = getAuthToken();
  if (!token) return;

  const periodSelect = document.getElementById('country-stats-period');
  const days = periodSelect ? parseInt(periodSelect.value) : 30;

  try {
    const response = await fetch(`/api/v1/analytics/stats-by-country?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des statistiques par pays');
    }

    const data = await response.json();
    const stats = data.stats || [];

    // Country names mapping
    const countryNames = {
      'FR': 'France',
      'SE': 'Suède',
      'DE': 'Allemagne',
      'IT': 'Italie',
      'ES': 'Espagne',
      'NL': 'Pays-Bas',
      'BE': 'Belgique',
      'AT': 'Autriche',
      'CH': 'Suisse',
      'GB': 'Royaume-Uni',
      'US': 'États-Unis',
      'CA': 'Canada'
    };

    // Render table
    const tbody = document.getElementById('country-stats-body');
    if (tbody) {
      if (stats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">Aucune donnée disponible</td></tr>';
      } else {
        tbody.innerHTML = stats.map(stat => `
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium text-gray-900">
              <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                ${countryNames[stat.country] || stat.country}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${formatNumber(stat.totalSales)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${stat.uniqueModels}</td>
            <td class="px-4 py-3 text-sm">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                stat.averageDOM < 20 ? 'bg-green-100 text-green-700' : 
                stat.averageDOM < 40 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-red-100 text-red-700'
              }">
                ⚡ ${stat.averageDOM} jours
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${formatCurrency(stat.medianPrice || 0)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${stat.velocityPerMonth.toFixed(1)}/mois</td>
          </tr>
        `).join('');
      }
    }

    // Render charts
    renderCountryCharts(stats, countryNames);

  } catch (error) {
    console.error('Error loading stats by country:', error);
  }
}

function renderCountryCharts(stats, countryNames) {
  if (!window.Chart) {
    console.warn('Chart.js not loaded');
    return;
  }

  // Sales by country chart
  const salesCtx = document.getElementById('sales-by-country-chart');
  if (salesCtx && stats.length > 0) {
    const existingChart = Chart.getChart(salesCtx);
    if (existingChart) {
      existingChart.destroy();
    }

    new Chart(salesCtx, {
      type: 'bar',
      data: {
        labels: stats.map(s => countryNames[s.country] || s.country),
        datasets: [{
          label: 'Nombre de ventes',
          data: stats.map(s => s.totalSales),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  // DOM by country chart
  const domCtx = document.getElementById('dom-by-country-chart');
  if (domCtx && stats.length > 0) {
    const existingChart = Chart.getChart(domCtx);
    if (existingChart) {
      existingChart.destroy();
    }

    new Chart(domCtx, {
      type: 'bar',
      data: {
        labels: stats.map(s => countryNames[s.country] || s.country),
        datasets: [{
          label: 'DOM Moyen (jours)',
          data: stats.map(s => s.averageDOM),
          backgroundColor: stats.map(s => 
            s.averageDOM < 20 ? 'rgba(34, 197, 94, 0.6)' :
            s.averageDOM < 40 ? 'rgba(234, 179, 8, 0.6)' :
            'rgba(239, 68, 68, 0.6)'
          ),
          borderColor: stats.map(s => 
            s.averageDOM < 20 ? 'rgba(34, 197, 94, 1)' :
            s.averageDOM < 40 ? 'rgba(234, 179, 8, 1)' :
            'rgba(239, 68, 68, 1)'
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Jours'
            }
          }
        }
      }
    });
  }
}

async function exportData(format = 'csv') {
  const token = getAuthToken();
  if (!token) {
    alert('Vous devez être connecté pour exporter');
    return;
  }

  const periodSelect = document.getElementById('period-select');
  const brandFilter = document.getElementById('brand-filter');
  const countryFilter = document.getElementById('country-filter');
  const yearFilter = document.getElementById('year-filter');

  const days = periodSelect ? parseInt(periodSelect.value) : 30;
  const brand = brandFilter ? brandFilter.value : null;
  const country = countryFilter ? countryFilter.value : null;
  const year = yearFilter ? yearFilter.value : null;

  try {
    const params = new URLSearchParams({
      limit: '1000',
      days: days.toString(),
      format: format
    });
    if (brand) params.append('brand', brand);
    if (country) params.append('country', country);
    if (year) params.append('year', year);

    const response = await fetch(`/api/v1/analytics/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'export');
    }

    if (format === 'csv') {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fastest-selling-models-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      const data = await response.json();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fastest-selling-models-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Erreur lors de l\'export: ' + error.message);
  }
}

// Model Comparison
let selectedModelsForComparison = [];

function showCompareModal() {
  const modal = document.createElement('div');
  modal.id = 'compare-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl max-w-2xl w-full p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900">Comparer des Modèles</h3>
        <button onclick="closeCompareModal()" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-4">
        <div id="selected-models-list" class="space-y-2 mb-4">
          <p class="text-sm text-gray-500">Sélectionnez 2 à 5 modèles (${selectedModelsForComparison.length}/5)</p>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <input type="text" id="compare-brand" placeholder="Marque" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <input type="text" id="compare-model" placeholder="Modèle" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <input type="number" id="compare-year" placeholder="Année (optionnel)" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <button onclick="addModelToComparison()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Ajouter
        </button>
        <div id="models-to-compare" class="space-y-2 max-h-48 overflow-y-auto"></div>
        <button onclick="compareSelectedModels()" 
                class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                ${selectedModelsForComparison.length < 2 ? 'disabled' : ''}>
          Comparer (${selectedModelsForComparison.length} modèles)
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  updateModelsToCompareList();
}

function closeCompareModal() {
  const modal = document.getElementById('compare-modal');
  if (modal) modal.remove();
}

function addModelToComparison() {
  const brand = document.getElementById('compare-brand')?.value.trim();
  const model = document.getElementById('compare-model')?.value.trim();
  const year = document.getElementById('compare-year')?.value.trim();

  if (!brand || !model) {
    alert('Veuillez entrer une marque et un modèle');
    return;
  }

  if (selectedModelsForComparison.length >= 5) {
    alert('Maximum 5 modèles peuvent être comparés');
    return;
  }

  const modelKey = `${brand}|${model}|${year || 'all'}`;
  if (selectedModelsForComparison.some(m => `${m.brand}|${m.model}|${m.year || 'all'}` === modelKey)) {
    alert('Ce modèle est déjà dans la liste');
    return;
  }

  selectedModelsForComparison.push({ brand, model, year: year ? parseInt(year) : null });
  document.getElementById('compare-brand').value = '';
  document.getElementById('compare-model').value = '';
  document.getElementById('compare-year').value = '';
  updateModelsToCompareList();
}

function updateModelsToCompareList() {
  const container = document.getElementById('models-to-compare');
  if (!container) return;

  if (selectedModelsForComparison.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Aucun modèle sélectionné</p>';
    return;
  }

  container.innerHTML = selectedModelsForComparison.map((m, index) => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span class="text-sm font-medium">${m.brand} ${m.model}${m.year ? ` ${m.year}` : ''}</span>
      <button onclick="removeModelFromComparison(${index})" class="text-red-600 hover:text-red-700 text-sm">
        ✕
      </button>
    </div>
  `).join('');

  const compareBtn = container.parentElement.querySelector('button[onclick="compareSelectedModels()"]');
  if (compareBtn) {
    compareBtn.disabled = selectedModelsForComparison.length < 2;
    compareBtn.textContent = `Comparer (${selectedModelsForComparison.length} modèles)`;
  }
}

function removeModelFromComparison(index) {
  selectedModelsForComparison.splice(index, 1);
  updateModelsToCompareList();
}

async function compareSelectedModels() {
  if (selectedModelsForComparison.length < 2) {
    alert('Sélectionnez au moins 2 modèles');
    return;
  }

  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch('/api/v1/analytics/compare-models?days=30', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ models: selectedModelsForComparison })
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la comparaison');
    }

    const data = await response.json();
    renderComparison(data.comparisons);
    closeCompareModal();
  } catch (error) {
    console.error('Error comparing models:', error);
    alert('Erreur: ' + error.message);
  }
}

// Intelligent Recommendations
async function loadRecommendations() {
  const token = getAuthToken();
  if (!token) return;

  const type = document.getElementById('recommendations-type')?.value || 'all';
  const container = document.getElementById('recommendations-content');
  if (!container) return;

  try {
    container.innerHTML = '<p class="text-center py-8 text-gray-500">Chargement...</p>';

    const response = await fetch(`/api/v1/analytics/recommendations?limit=10&type=${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement');
    }

    const data = await response.json();
    const recommendations = data.recommendations || [];

    if (recommendations.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8">Aucune recommandation disponible</p>';
      return;
    }

    container.innerHTML = recommendations.map(rec => {
      const badgeColor = rec.type === 'underrated' ? 'bg-purple-100 text-purple-700' :
                        rec.type === 'fast_rising' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700';

      return `
        <div class="border border-gray-200 rounded-lg p-4 mb-4 hover:bg-gray-50 transition">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <h4 class="font-semibold text-gray-900">${rec.brand} ${rec.model}${rec.year ? ` ${rec.year}` : ''}</h4>
                <span class="px-2 py-1 ${badgeColor} rounded text-xs font-medium">${rec.reason || rec.type}</span>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                ${rec.averageDOM ? `<div><span class="text-gray-600">DOM:</span> <span class="font-semibold">${rec.averageDOM}j</span></div>` : ''}
                ${rec.avgPriceDrop ? `<div><span class="text-gray-600">Baisse:</span> <span class="font-semibold text-red-600">-${rec.avgPriceDrop}%</span></div>` : ''}
                ${rec.salesCount ? `<div><span class="text-gray-600">Ventes:</span> <span class="font-semibold">${rec.salesCount}</span></div>` : ''}
                ${rec.currentRank ? `<div><span class="text-gray-600">Rang:</span> <span class="font-semibold">#${rec.currentRank}</span></div>` : ''}
                ${rec.maxPriceDrop ? `<div><span class="text-gray-600">Baisse max:</span> <span class="font-semibold text-red-600">-${rec.maxPriceDrop}%</span></div>` : ''}
              </div>
              ${rec.potentialScore ? `<div class="mt-2"><span class="text-xs text-gray-500">Score de potentiel: ${rec.potentialScore}/100</span></div>` : ''}
            </div>
            <div class="flex flex-col space-y-2 ml-4">
              <button onclick="addToWatchlistFromRecommendation('${rec.brand}', '${rec.model}', ${rec.year || 'null'})" 
                      class="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                ⭐ Ajouter
              </button>
              <button onclick="showCreateAlertModal('${rec.brand}', '${rec.model}', ${rec.year || 'null'})" 
                      class="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                🔔 Alerte
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading recommendations:', error);
    container.innerHTML = `<p class="text-red-500 text-center py-8">Erreur: ${error.message}</p>`;
  }
}

// Competition Analysis
async function loadCompetitionAnalysis() {
  const token = getAuthToken();
  if (!token) return;

  const brand = document.getElementById('competition-brand')?.value.trim();
  const model = document.getElementById('competition-model')?.value.trim();
  const year = document.getElementById('competition-year')?.value.trim();

  if (!brand || !model) {
    alert('Veuillez entrer une marque et un modèle');
    return;
  }

  const container = document.getElementById('competition-content');
  if (!container) return;

  try {
    container.innerHTML = '<p class="text-center py-8 text-gray-500">Analyse en cours...</p>';

    const params = new URLSearchParams({ brand, model });
    if (year) params.append('year', year);

    const response = await fetch(`/api/v1/analytics/competition?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'analyse');
    }

    const data = await response.json();
    const competition = data.competition;

    const scarcityColor = competition.scarcityLevel === 'high_demand' ? 'bg-red-100 text-red-700' :
                         competition.scarcityLevel === 'oversupply' ? 'bg-yellow-100 text-yellow-700' :
                         competition.scarcityLevel === 'low_supply' ? 'bg-blue-100 text-blue-700' :
                         'bg-gray-100 text-gray-700';

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-600 mb-2">Annonces Actives</h3>
          <p class="text-3xl font-bold text-blue-600">${competition.activeListings}</p>
          <p class="text-xs text-gray-500 mt-1">Concurrents sur le marché</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-600 mb-2">Vendues (90j)</h3>
          <p class="text-3xl font-bold text-green-600">${competition.soldListings}</p>
          <p class="text-xs text-gray-500 mt-1">Ventes récentes</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-600 mb-2">Taux de Saturation</h3>
          <p class="text-3xl font-bold text-purple-600">${competition.saturationRate}%</p>
          <p class="text-xs text-gray-500 mt-1">% d'annonces actives</p>
        </div>
      </div>
      <div class="${competition.scarcityLevel === 'high_demand' ? 'bg-red-50' : competition.scarcityLevel === 'oversupply' ? 'bg-yellow-50' : 'bg-blue-50'} rounded-lg p-4 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-gray-900 mb-1">Niveau de Rareté</h3>
            <p class="text-sm text-gray-600">${competition.scarcityMessage}</p>
          </div>
          <span class="px-3 py-1 ${scarcityColor} rounded-full text-sm font-medium">
            ${competition.scarcityLevel === 'high_demand' ? '🔥 Pénurie' : 
              competition.scarcityLevel === 'oversupply' ? '⚠️ Surplus' :
              competition.scarcityLevel === 'low_supply' ? '📉 Offre limitée' : '📊 Normal'}
          </span>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-600 mb-3">Métriques de Vente</h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">DOM Moyen (actifs):</span>
              <span class="font-semibold">${competition.averageActiveDOM} jours</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">DOM Moyen (vendus):</span>
              <span class="font-semibold">${competition.averageSoldDOM} jours</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Taux de Conversion:</span>
              <span class="font-semibold">${competition.conversionRate}%</span>
            </div>
          </div>
        </div>
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-600 mb-3">Gamme de Prix</h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Minimum:</span>
              <span class="font-semibold">${formatCurrency(competition.priceRange.min)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">${tr('Median:', 'Médian:')}</span>
              <span class="font-semibold">${formatCurrency(competition.priceRange.median)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">${tr('Maximum:', 'Maximum:')}</span>
              <span class="font-semibold">${formatCurrency(competition.priceRange.max)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">${tr('Average:', 'Moyenne:')}</span>
              <span class="font-semibold">${formatCurrency(competition.priceRange.average)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading competition analysis:', error);
    container.innerHTML = `<p class="text-red-500 text-center py-8">Erreur: ${error.message}</p>`;
  }
}

// Watchlist
async function loadWatchlist() {
  const token = getAuthToken();
  if (!token) return;

  const container = document.getElementById('watchlist-content');
  if (!container) return;

  try {
    container.innerHTML = '<p class="text-center py-8 text-gray-500">Chargement...</p>';

    const response = await fetch('/api/v1/analytics/watchlist', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement');
    }

    const data = await response.json();
    const watchlist = data.watchlist || [];

    if (watchlist.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">Votre watchlist est vide</p>
          <button onclick="showAddWatchlistModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Ajouter votre premier modèle
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modèle</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rang Actuel</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOM Moyen</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vélocité</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Médian</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${watchlist.map(item => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                  ${item.brand} ${item.model}${item.year ? ` ${item.year}` : ''}
                  ${item.notes ? `<br><span class="text-xs text-gray-500">${item.notes}</span>` : ''}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  ${item.currentStats?.currentRank ? `#${item.currentStats.currentRank}` : '-'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  ${item.currentStats?.averageDOM || '-'}${item.currentStats?.averageDOM ? 'j' : ''}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  ${item.currentStats?.velocityPerMonth ? `${item.currentStats.velocityPerMonth.toFixed(1)}/mois` : '-'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  ${item.currentStats?.medianPrice ? formatCurrency(item.currentStats.medianPrice) : '-'}
                </td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex space-x-2">
                    <button onclick="removeFromWatchlist('${item.id}')" class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                      ✕ Retirer
                    </button>
                    <button onclick="viewWatchlistHistory('${item.id}')" class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                      📊 Historique
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (error) {
    console.error('Error loading watchlist:', error);
    container.innerHTML = `<p class="text-red-500 text-center py-8">Erreur: ${error.message}</p>`;
  }
}

function showAddWatchlistModal() {
  const modal = document.createElement('div');
  modal.id = 'watchlist-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl max-w-md w-full p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900">Ajouter à la Watchlist</h3>
        <button onclick="closeWatchlistModal()" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Marque</label>
          <input type="text" id="watchlist-brand" placeholder="Ex: BMW" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Modèle</label>
          <input type="text" id="watchlist-model" placeholder="Ex: 320d" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Année (optionnel)</label>
          <input type="number" id="watchlist-year" placeholder="Ex: 2020" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
          <textarea id="watchlist-notes" placeholder="Notes personnelles..." rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></textarea>
        </div>
        <div class="flex space-x-3">
          <button onclick="submitWatchlist()" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Ajouter
          </button>
          <button onclick="closeWatchlistModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            Annuler
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeWatchlistModal() {
  const modal = document.getElementById('watchlist-modal');
  if (modal) modal.remove();
}

async function submitWatchlist() {
  const token = getAuthToken();
  if (!token) {
    alert('Vous devez être connecté');
    return;
  }

  const brand = document.getElementById('watchlist-brand')?.value.trim();
  const model = document.getElementById('watchlist-model')?.value.trim();
  const year = document.getElementById('watchlist-year')?.value.trim();
  const notes = document.getElementById('watchlist-notes')?.value.trim();

  if (!brand || !model) {
    alert('Veuillez entrer une marque et un modèle');
    return;
  }

  try {
    const response = await fetch('/api/v1/analytics/watchlist', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brand,
        model,
        year: year ? parseInt(year) : null,
        notes: notes || null
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de l\'ajout');
    }

    alert('✅ Modèle ajouté à la watchlist');
    closeWatchlistModal();
    loadWatchlist();
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    alert('Erreur: ' + error.message);
  }
}

async function addToWatchlistFromRecommendation(brand, model, year) {
  const token = getAuthToken();
  if (!token) {
    alert('Vous devez être connecté');
    return;
  }

  try {
    const response = await fetch('/api/v1/analytics/watchlist', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brand,
        model,
        year: year && year !== 'null' ? parseInt(year) : null
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de l\'ajout');
    }

    alert('✅ Modèle ajouté à la watchlist');
    loadWatchlist();
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    alert('Erreur: ' + error.message);
  }
}

async function removeFromWatchlist(id) {
  if (!confirm('Retirer ce modèle de la watchlist ?')) return;

  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch(`/api/v1/analytics/watchlist/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la suppression');
    }

    loadWatchlist();
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    alert('Erreur: ' + error.message);
  }
}

async function viewWatchlistHistory(id) {
  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch(`/api/v1/analytics/watchlist/${id}/history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement');
    }

    const data = await response.json();
    const history = data.history || [];

    if (history.length === 0) {
      alert('Aucun historique disponible pour ce modèle');
      return;
    }

    // Show history in a modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900">Historique</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="space-y-2">
          ${history.map(h => `
            <div class="border border-gray-200 rounded-lg p-3">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-900">${h.metric_type}</span>
                <span class="text-xs text-gray-500">${new Date(h.recorded_at).toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-US')}</span>
              </div>
              <div class="mt-1 text-sm text-gray-600">
                ${h.old_value !== null ? `${h.old_value} → ${h.new_value}` : `Nouvelle valeur: ${h.new_value}`}
                ${h.change_pct ? ` (${h.change_pct > 0 ? '+' : ''}${h.change_pct}%)` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Error loading watchlist history:', error);
    alert('Erreur: ' + error.message);
  }
}

function renderComparison(comparisons) {
  const container = document.getElementById('compare-models-content');
  if (!container) return;

  if (!window.Chart) {
    container.innerHTML = '<p class="text-red-500">Chart.js n\'est pas chargé</p>';
    return;
  }

  // Create comparison table
  const tableHTML = `
    <div class="overflow-x-auto mb-6">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modèle</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventes</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOM Moyen</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix Médian</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vélocité/mois</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taux Conversion</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${comparisons.map(c => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium">${c.brand} ${c.model}${c.year ? ` ${c.year}` : ''}</td>
              <td class="px-4 py-3 text-sm text-gray-600">${c.totalSales || 0}</td>
              <td class="px-4 py-3 text-sm text-gray-600">${c.averageDOM || 0}j</td>
              <td class="px-4 py-3 text-sm text-gray-600">${formatCurrency(c.medianPrice || 0)}</td>
              <td class="px-4 py-3 text-sm text-gray-600">${c.velocityPerMonth?.toFixed(1) || 0}/mois</td>
              <td class="px-4 py-3 text-sm text-gray-600">${c.conversionRate?.toFixed(1) || 0}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Create comparison charts
  const chartsHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">DOM Moyen</h3>
        <canvas id="compare-dom-chart"></canvas>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Prix Médian</h3>
        <canvas id="compare-price-chart"></canvas>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Vélocité</h3>
        <canvas id="compare-velocity-chart"></canvas>
      </div>
    </div>
  `;

  container.innerHTML = tableHTML + chartsHTML;

  // Render charts
  const labels = comparisons.map(c => `${c.brand} ${c.model}${c.year ? ` ${c.year}` : ''}`);

  // DOM Chart
  const domCtx = document.getElementById('compare-dom-chart');
  if (domCtx) {
    new Chart(domCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'DOM Moyen (jours)',
          data: comparisons.map(c => c.averageDOM || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Price Chart
  const priceCtx = document.getElementById('compare-price-chart');
  if (priceCtx) {
    new Chart(priceCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Prix Médian (EUR)',
          data: comparisons.map(c => c.medianPrice || 0),
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Velocity Chart
  const velocityCtx = document.getElementById('compare-velocity-chart');
  if (velocityCtx) {
    new Chart(velocityCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Vélocité/mois',
          data: comparisons.map(c => c.velocityPerMonth || 0),
          backgroundColor: 'rgba(234, 179, 8, 0.6)',
          borderColor: 'rgba(234, 179, 8, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

// Model Trends
async function loadModelTrends() {
  const token = getAuthToken();
  if (!token) return;

  const brand = document.getElementById('trends-brand')?.value.trim();
  const model = document.getElementById('trends-model')?.value.trim();
  const year = document.getElementById('trends-year')?.value.trim();
  const months = document.getElementById('trends-months')?.value || 12;

  if (!brand || !model) {
    alert('Veuillez entrer une marque et un modèle');
    return;
  }

  const container = document.getElementById('trends-content');
  if (!container) return;

  try {
    container.innerHTML = '<p class="text-center py-8 text-gray-500">Chargement...</p>';

    const params = new URLSearchParams({ brand, model, months });
    if (year) params.append('year', year);

    const response = await fetch(`/api/v1/analytics/trends?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des tendances');
    }

    const data = await response.json();
    renderTrends(data);
  } catch (error) {
    console.error('Error loading trends:', error);
    container.innerHTML = `<p class="text-red-500 text-center py-8">Erreur: ${error.message}</p>`;
  }
}

function renderTrends(data) {
  const container = document.getElementById('trends-content');
  if (!container || !window.Chart) return;

  if (data.trends.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">Aucune donnée disponible</p>';
    return;
  }

  const trendDirection = data.trendDirection;
  const trendHTML = trendDirection ? `
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Direction des Tendances</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-600">DOM: 
            <span class="font-semibold ${trendDirection.dom === 'down' ? 'text-green-600' : trendDirection.dom === 'up' ? 'text-red-600' : 'text-gray-600'}">
              ${trendDirection.dom === 'down' ? '↓' : trendDirection.dom === 'up' ? '↑' : '→'} 
              ${trendDirection.domChange > 0 ? '+' : ''}${trendDirection.domChange} jours
            </span>
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Prix: 
            <span class="font-semibold ${trendDirection.price === 'down' ? 'text-green-600' : trendDirection.price === 'up' ? 'text-red-600' : 'text-gray-600'}">
              ${trendDirection.price === 'down' ? '↓' : trendDirection.price === 'up' ? '↑' : '→'} 
              ${trendDirection.priceChange > 0 ? '+' : ''}${trendDirection.priceChange}€ (${trendDirection.priceChangePct > 0 ? '+' : ''}${trendDirection.priceChangePct}%)
            </span>
          </p>
        </div>
      </div>
    </div>
  ` : '';

  const chartsHTML = `
    ${trendHTML}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Évolution du DOM</h3>
        <canvas id="trends-dom-chart"></canvas>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Évolution du Prix</h3>
        <canvas id="trends-price-chart"></canvas>
      </div>
    </div>
  `;

  container.innerHTML = chartsHTML;

  // Render DOM trend chart
  const domCtx = document.getElementById('trends-dom-chart');
  if (domCtx) {
    new Chart(domCtx, {
      type: 'line',
      data: {
        labels: data.trends.map(t => t.month),
        datasets: [{
          label: 'DOM Moyen (jours)',
          data: data.trends.map(t => t.averageDOM),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Render Price trend chart
  const priceCtx = document.getElementById('trends-price-chart');
  if (priceCtx) {
    new Chart(priceCtx, {
      type: 'line',
      data: {
        labels: data.trends.map(t => t.month),
        datasets: [{
          label: 'Prix Moyen (EUR)',
          data: data.trends.map(t => t.averagePrice),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

// Profitability Analysis
async function loadProfitability() {
  const token = getAuthToken();
  if (!token) return;

  const country = document.getElementById('profitability-country')?.value || null;
  const days = document.getElementById('profitability-days')?.value || 90;

  const tbody = document.getElementById('profitability-body');
  if (!tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">Chargement...</td></tr>';

    const params = new URLSearchParams({ days, minSales: '5' });
    if (country) params.append('country', country);

    const response = await fetch(`/api/v1/analytics/profitability?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors du chargement');
    }

    const data = await response.json();
    const profitability = data.profitability || [];

    if (profitability.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">Aucune donnée disponible</td></tr>';
      return;
    }

    tbody.innerHTML = profitability.map(p => `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 text-sm font-medium text-gray-900">
          ${p.brand} ${p.model}${p.year ? ` ${p.year}` : ''}
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${p.salesCount}</td>
        <td class="px-4 py-3 text-sm font-semibold ${p.averageProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
          ${formatCurrency(p.averageProfit)}
        </td>
        <td class="px-4 py-3 text-sm font-semibold ${p.averageROI >= 0 ? 'text-green-600' : 'text-red-600'}">
          ${p.averageROI >= 0 ? '+' : ''}${p.averageROI.toFixed(1)}%
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${p.averageProfitMargin.toFixed(1)}%</td>
        <td class="px-4 py-3 text-sm text-gray-600">${formatCurrency(p.profitPerDay)}/${tr('day', 'jour')}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${p.averageDOM}j</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading profitability:', error);
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-red-500">Erreur: ${error.message}</td></tr>`;
  }
}

// Create Fast Model Alert
async function createFastModelAlert(brand, model, year, alertType, threshold) {
  const token = getAuthToken();
  if (!token) {
    alert('Vous devez être connecté');
    return;
  }

  try {
    const response = await fetch('/api/v1/analytics/alerts/fast-model', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brand,
        model,
        year: year || null,
        alertType,
        threshold: threshold || {}
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la création de l\'alerte');
    }

    const data = await response.json();
    alert(`✅ Alerte créée: ${data.alert.name}`);
    return data.alert;
  } catch (error) {
    console.error('Error creating alert:', error);
    alert('Erreur: ' + error.message);
    throw error;
  }
}

// Show alert creation modal
function showCreateAlertModal(brand, model, year) {
  const modal = document.createElement('div');
  modal.id = 'alert-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl max-w-md w-full p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900">Créer une Alerte</h3>
        <button onclick="closeAlertModal()" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <p class="text-sm text-gray-600 mb-2">Modèle: <span class="font-semibold">${brand} ${model}${year ? ` ${year}` : ''}</span></p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Type d'alerte</label>
          <select id="alert-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="top10">Entrer dans le top 10</option>
            <option value="velocity">Dépasser un seuil de vélocité</option>
            <option value="dom_drop">DOM moyen baisse significativement</option>
          </select>
        </div>
        <div id="threshold-input" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-2">Seuil</label>
          <input type="number" id="alert-threshold" placeholder="Ex: 5 ventes/mois" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <div class="flex space-x-3">
          <button onclick="submitAlert('${brand}', '${model}', ${year || 'null'})" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Créer l'alerte
          </button>
          <button onclick="closeAlertModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            Annuler
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Show threshold input for velocity alert
  document.getElementById('alert-type').addEventListener('change', (e) => {
    const thresholdInput = document.getElementById('threshold-input');
    if (e.target.value === 'velocity') {
      thresholdInput.classList.remove('hidden');
    } else {
      thresholdInput.classList.add('hidden');
    }
  });
}

function closeAlertModal() {
  const modal = document.getElementById('alert-modal');
  if (modal) modal.remove();
}

async function submitAlert(brand, model, year) {
  const alertType = document.getElementById('alert-type').value;
  const thresholdValue = document.getElementById('alert-threshold').value;

  const threshold = alertType === 'velocity' && thresholdValue 
    ? { velocityPerMonth: parseFloat(thresholdValue) }
    : {};

  try {
    await createFastModelAlert(brand, model, year, alertType, threshold);
    closeAlertModal();
  } catch (error) {
    // Error already handled in createFastModelAlert
  }
}

// Predictions
async function loadPredictions() {
  const token = getAuthToken();
  if (!token) return;

  const brand = document.getElementById('predict-brand')?.value.trim();
  const model = document.getElementById('predict-model')?.value.trim();
  const year = document.getElementById('predict-year')?.value.trim();
  const currentPrice = document.getElementById('predict-price')?.value.trim();
  const currentDOM = document.getElementById('predict-dom')?.value.trim();

  if (!brand || !model || !currentPrice) {
    alert('Veuillez remplir au moins la marque, le modèle et le prix actuel');
    return;
  }

  const container = document.getElementById('predictions-content');
  if (!container) return;

  try {
    container.innerHTML = '<p class="text-center py-8 text-gray-500">Calcul en cours...</p>';

    const params = new URLSearchParams({ brand, model, currentPrice });
    if (year) params.append('year', year);
    if (currentDOM) params.append('currentDOM', currentDOM);

    const response = await fetch(`/api/v1/analytics/predictions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors du calcul');
    }

    const data = await response.json();
    const predictions = data.predictions;

    const dealScoreColor = predictions.dealScore.score >= 80 ? 'bg-green-100 text-green-700 border-green-300' :
                          predictions.dealScore.score >= 65 ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          predictions.dealScore.score >= 50 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          'bg-red-100 text-red-700 border-red-300';

    const trendIcon = predictions.price.trend === 'up' ? '↑' : predictions.price.trend === 'down' ? '↓' : '→';
    const trendColor = predictions.price.trend === 'up' ? 'text-red-600' : predictions.price.trend === 'down' ? 'text-green-600' : 'text-gray-600';

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Deal Score -->
        <div class="border-2 ${dealScoreColor} rounded-lg p-6 text-center">
          <h3 class="text-sm font-medium mb-2">Score d'Affaire</h3>
          <p class="text-5xl font-bold mb-2">${predictions.dealScore.score}/100</p>
          <p class="text-sm font-semibold">${predictions.dealScore.message}</p>
          <p class="text-xs mt-2 opacity-75">${predictions.dealScore.level === 'excellent' ? 'Excellente opportunité !' :
            predictions.dealScore.level === 'good' ? 'Bonne affaire' :
            predictions.dealScore.level === 'fair' ? 'Prix correct' : 'Prix élevé'}</p>
        </div>

        <!-- Sale Time Prediction -->
        <div class="border border-gray-200 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-600 mb-2">Temps de Vente Prédit</h3>
          <p class="text-3xl font-bold text-blue-600 mb-2">${predictions.saleTime.days} jours</p>
          <p class="text-sm text-gray-600 mb-2">${predictions.saleTime.message}</p>
          <div class="mt-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Confiance</span>
              <span>${predictions.saleTime.confidence}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-blue-600 h-2 rounded-full" style="width: ${predictions.saleTime.confidence}%"></div>
            </div>
          </div>
        </div>

        <!-- Price Prediction -->
        <div class="border border-gray-200 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-600 mb-2">Prédiction de Prix</h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Actuel:</span>
              <span class="font-semibold">${formatCurrency(predictions.price.current)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">${tr('Predicted:', 'Prédit:')}</span>
              <span class="font-semibold ${trendColor}">${formatCurrency(predictions.price.predicted)} ${trendIcon}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">${tr('Market:', 'Marché:')}</span>
              <span class="font-semibold">${formatCurrency(predictions.price.marketPrice)}</span>
            </div>
            <div class="pt-2 border-t border-gray-200">
              <div class="text-xs text-gray-500">
                ${predictions.price.priceDifferencePct !== 0 ? 
                  `Écart marché: ${predictions.price.priceDifference > 0 ? '+' : ''}${predictions.price.priceDifferencePct}%` : 
                  'Prix aligné avec le marché'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading predictions:', error);
    container.innerHTML = `<p class="text-red-500 text-center py-8">Erreur: ${error.message}</p>`;
  }
}

