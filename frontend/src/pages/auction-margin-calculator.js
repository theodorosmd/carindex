import { getAuthToken } from '../main.js'
import { tr, renderLanguageToggle, attachLanguageToggle, getLang, formatNumber, formatCurrency } from '../utils/i18n.js'

// API base URL
const API_BASE = '/api/v1'

/**
 * Render the auction margin calculator page
 */
export function renderAuctionMarginCalculator() {
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
              <a href="#/dashboard" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('Dashboard', 'Dashboard')}</a>
              <a href="#/evaluations" class="text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('My Evaluations', 'Mes Évaluations')}</a>
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
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">${tr('Margin Calculator - South of France', 'Calculateur de Marge - Sud de la France')}</h1>
          <p class="text-gray-600">${tr('Calculate resale margin for vehicles purchased at auction', 'Calculez la marge de revente pour les véhicules achetés aux enchères')}</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Left Column: Form -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4" id="form-title">${tr('Vehicle information', 'Informations véhicule')}</h2>
            
            <form id="auction-form" class="space-y-4">

              <!-- Listing type toggle -->
              <div class="flex rounded-lg border border-gray-300 overflow-hidden">
                <button type="button" id="type-auction" data-type="auction"
                        class="flex-1 py-2 px-4 text-sm font-medium bg-blue-600 text-white transition">
                  🔨 ${tr('Auction', 'Enchère')}
                </button>
                <button type="button" id="type-regular" data-type="regular"
                        class="flex-1 py-2 px-4 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition">
                  🏷️ ${tr('Regular listing', 'Annonce classique')}
                </button>
              </div>
              <input type="hidden" id="listing_type" name="listing_type" value="auction">

              <!-- URL Input with Parse Button -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" id="url-label">${tr('Listing URL *', 'URL de l\'annonce *')}</label>
                <div class="flex gap-2">
                  <input type="url" id="auction-url" name="auction-url"
                         placeholder="https://www.kvd.se/... or bytbil.com, blocket.se, autoscout24, etc."
                         class="flex-1 px-3 py-2 border border-gray-300 rounded-md" required>
                  <button type="button" id="parse-url-btn"
                          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium whitespace-nowrap">
                    ${tr('Analyze', 'Analyser')}
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">${tr('Paste any car listing URL (KVD, Bytbil, Blocket, AutoScout24, Mobile.de, Leboncoin, etc.) to auto-fill the fields', 'Collez n\'importe quelle URL d\'annonce (KVD, Bytbil, Blocket, AutoScout24, Mobile.de, Leboncoin, etc.) pour remplir automatiquement les champs')}</p>
                <div id="parse-status" class="mt-2 text-sm hidden"></div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Brand *', 'Marque *')}</label>
                  <input type="text" id="brand" name="brand" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Model *', 'Modèle *')}</label>
                  <input type="text" id="model" name="model" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Trim', 'Finition')}</label>
                <input type="text" id="trim" name="trim" class="w-full px-3 py-2 border border-gray-300 rounded-md">
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Year *', 'Année *')}</label>
                  <input type="number" id="year" name="year" min="1990" max="2100" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Mileage *', 'Kilométrage *')}</label>
                  <input type="number" id="mileage" name="mileage" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Power (hp)', 'Puissance (ch)')}</label>
                  <input type="number" id="power_hp" name="power_hp" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Fuel type', 'Carburant')}</label>
                  <select id="fuel_type" name="fuel_type" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">${tr('Select', 'Choisir')}</option>
                    <option value="petrol">${tr('Petrol', 'Essence')}</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">${tr('Electric', 'Électrique')}</option>
                    <option value="hybrid">${tr('Hybrid', 'Hybride')}</option>
                    <option value="gpl">GPL</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Transmission', 'Transmission')}</label>
                  <select id="transmission" name="transmission" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">${tr('Select', 'Choisir')}</option>
                    <option value="manual">${tr('Manual', 'Manuelle')}</option>
                    <option value="automatic">${tr('Automatic', 'Automatique')}</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" id="price-label">${tr('Purchase price (SEK) *', 'Prix d\'achat (SEK) *')}</label>
                  <input type="number" id="auction_price_sek" name="auction_price_sek" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                </div>
                <div id="auction-fee-row">
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Auction fee (EUR)', 'Frais d\'enchère (EUR)')}</label>
                  <input type="number" id="auction_fee_eur" name="auction_fee_eur" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-md" value="0">
                </div>
              </div>

              <!-- Hidden fields for source and source_listing_id (auto-filled from URL parsing) -->
              <input type="hidden" id="source" name="source">
              <input type="hidden" id="source_listing_id" name="source_listing_id">
              <input type="hidden" id="url" name="url">

              <!-- Evaluation Name (optional) -->
              <div class="border-t pt-4 mt-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Evaluation name (optional)', 'Nom de l\'évaluation (optionnel)')}</label>
                  <input type="text" id="evaluation-name" name="evaluation-name"
                         placeholder="${tr('Ex: Audi Q4 2024 - Evaluation 1', 'Ex: Audi Q4 2024 - Évaluation 1')}"
                         maxlength="255"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <p class="text-xs text-gray-500 mt-1">${tr('Give this evaluation a name to find it later', 'Donnez un nom à cette évaluation pour la retrouver plus tard')}</p>
                </div>
              </div>

              <!-- French Malus Configuration -->
              <div class="border-t pt-4 mt-6 bg-blue-50 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-4 text-blue-900">🟢 ${tr('French ecological malus', 'Malus écologique français')}</h3>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('WLTP CO₂ emissions (g/km)', 'Émissions CO₂ WLTP (g/km)')}</label>
                    <input type="number" id="co2_g_km_wltp" name="co2_g_km_wltp" min="0" step="1" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md"
                           placeholder="Ex: 150">
                    <p class="text-xs text-gray-500 mt-1">${tr('Optional - to calculate ecological malus', 'Optionnel - pour calculer le malus écologique')}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Vehicle category', 'Catégorie véhicule')}</label>
                    <select id="vehicle_category" name="vehicle_category" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="VP">${tr('VP (Passenger car)', 'VP (Véhicule particulier)')}</option>
                      <option value="VUL">${tr('VUL (Light commercial vehicle)', 'VUL (Véhicule utilitaire léger)')}</option>
                      <option value="OTHER">${tr('Other', 'Autre')}</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('First registration date (abroad)', 'Date première immatriculation (à l\'étranger)')}</label>
                    <input type="date" id="first_registration_date" name="first_registration_date"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <p class="text-xs text-gray-500 mt-1">${tr('To calculate depreciation (reduction by age)', 'Pour calculer la décote (réduction selon l\'âge)')}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Registration date in France', 'Date d\'immatriculation en France')}</label>
                    <input type="date" id="registration_in_france_date" name="registration_in_france_date"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <p class="text-xs text-gray-500 mt-1">${tr('Default: today', 'Par défaut: aujourd\'hui')}</p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Kerb weight (kg)', 'Masse en ordre de marche (kg)')}</label>
                    <input type="number" id="mass_kg" name="mass_kg" min="0" step="1"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md"
                           placeholder="Ex: 1800">
                    <p class="text-xs text-gray-500 mt-1">${tr('Optional - for weight malus (not yet implemented)', 'Optionnel - pour le malus poids (non implémenté)')}</p>
                  </div>
                  <div class="flex items-end">
                    <label class="flex items-center">
                      <input type="checkbox" id="is_first_registration_in_france" name="is_first_registration_in_france"
                             checked class="mr-2">
                      <span class="text-sm text-gray-700">${tr('First registration in France', 'Première immatriculation en France')}</span>
                    </label>
                  </div>
                </div>
              </div>
              <!-- End French Malus Configuration -->

              <!-- Cost Configuration -->
              <div class="border-t pt-4 mt-6">
                <h3 class="text-lg font-semibold mb-4">${tr('Cost configuration', 'Configuration des coûts')}</h3>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('SEK/EUR exchange rate', 'Taux de change SEK/EUR')}</label>
                    <input type="number" id="fx_rate" name="fx_rate" min="0" step="0.000001" class="w-full px-3 py-2 border border-gray-300 rounded-md" value="0.085">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Transport (EUR)', 'Transport (EUR)')}</label>
                    <input type="number" id="transport_eur" name="transport_eur" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-md" value="1500">
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Registration (EUR)', 'Immatriculation (EUR)')}</label>
                    <input type="number" id="registration_eur" name="registration_eur" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-md" value="0">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${tr('Total reconditioning (EUR) *', 'Réconditionnement total (EUR) *')}</label>
                    <input type="number" id="reconditioning_total_eur" name="reconditioning_total_eur" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-md" value="500">
                    <p class="text-xs text-gray-500 mt-1">${tr('Includes tyres, repairs, contingency, etc.', 'Inclut pneus, réparations, contingence, etc.')}</p>
                  </div>
                </div>

                <div class="mt-4 p-3 bg-blue-50 rounded-md">
                  <label class="block text-sm font-medium text-gray-700 mb-1">${tr('VAT mode', 'Mode TVA')}</label>
                  <select id="vat_mode" name="vat_mode" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                    <option value="margin_scheme">${tr('Margin scheme', 'Régime de marge')}</option>
                    <option value="vat_reclaimable">${tr('Reclaimable VAT', 'TVA récupérable')}</option>
                  </select>
                  <p class="text-xs text-gray-600 mt-1" id="vat-mode-info">${tr('Auto-detected from the listing (editable)', 'Détecté automatiquement depuis l\'annonce (modifiable)')}</p>
                </div>
              </div>

              <button type="submit" id="calculate-btn" class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-semibold">
                ${tr('Calculate South of France margin', 'Calculer la marge Sud de la France')}
              </button>
            </form>
          </div>

          <!-- Right Column: Results -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4">${tr('Results', 'Résultats')}</h2>

            <!-- Loading State -->
            <div id="loading-state" class="hidden text-center py-12">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p class="mt-4 text-gray-600">${tr('Calculating...', 'Calcul en cours...')}</p>
            </div>

            <!-- Error State -->
            <div id="error-state" class="hidden text-center py-12">
              <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 class="mt-4 text-lg font-medium text-gray-900">${tr('Error', 'Erreur')}</h3>
              <p class="mt-2 text-sm text-gray-500" id="error-message"></p>
              <div id="error-suggestions" class="hidden mt-4 text-left max-w-md mx-auto">
                <p class="text-sm font-medium text-gray-700 mb-2">${tr('Suggestions:', 'Suggestions :')}</p>
                <ul class="text-sm text-gray-600 list-disc list-inside space-y-1" id="error-suggestions-list"></ul>
              </div>
            </div>

            <!-- Results Content -->
            <div id="results-content" class="hidden space-y-6">
              <!-- Save Success Message -->
              <div id="save-success-message" class="hidden bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <svg class="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-sm text-green-800">
                      <span id="save-message-text">${tr('Evaluation saved successfully', 'Évaluation sauvegardée avec succès')}</span>
                    </p>
                  </div>
                  <a href="#/evaluations" class="text-sm text-green-700 hover:text-green-900 font-medium underline">
                    ${tr('View my evaluations →', 'Voir mes évaluations →')}
                  </a>
                </div>
              </div>

              <!-- Price Estimate -->
              <div>
                <h3 class="text-lg font-semibold mb-3">${tr('Price estimate', 'Estimation de prix')}</h3>
                <div class="grid grid-cols-3 gap-4">
                  <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600">${tr('Low', 'Bas')}</p>
                    <p class="text-2xl font-bold text-blue-600" id="price-low">-</p>
                  </div>
                  <div class="bg-green-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600">${tr('Median', 'Médian')}</p>
                    <p class="text-2xl font-bold text-green-600" id="price-mid">-</p>
                  </div>
                  <div class="bg-purple-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600">${tr('High', 'Haut')}</p>
                    <p class="text-2xl font-bold text-purple-600" id="price-high">-</p>
                  </div>
                </div>
                
                <!-- Adjustment Details -->
                <div id="adjustment-details" class="hidden mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 class="text-sm font-semibold text-yellow-800 mb-2">${tr('Adjustment details', 'Détails de l\'ajustement')}</h4>
                  <div class="space-y-2 text-sm">
                    <div id="adjustment-before-price" class="text-gray-700"></div>
                    <div class="border-t border-yellow-300 pt-2 mt-2">
                      <div id="adjustment-year-detail" class="mb-1"></div>
                      <div id="adjustment-mileage-detail" class="mb-1"></div>
                      <div class="flex justify-between items-center mt-2 pt-2 border-t border-yellow-300">
                        <span class="font-semibold text-yellow-900">${tr('Total adjustment:', 'Ajustement total:')}</span>
                        <span id="adjustment-total" class="font-bold text-yellow-900"></span>
                      </div>
                    </div>
                    <div id="adjustment-after-price" class="text-gray-700 mt-2"></div>
                  </div>
                </div>
              </div>

              <!-- Costs Breakdown -->
              <div>
                <h3 class="text-lg font-semibold mb-3">${tr('Cost breakdown', 'Détail des coûts')}</h3>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2" id="costs-breakdown">
                  <!-- Costs will be inserted here -->
                </div>
              </div>

              <!-- Margin -->
              <div>
                <h3 class="text-lg font-semibold mb-3">${tr('Margin', 'Marge')}</h3>
                <div class="grid grid-cols-3 gap-4">
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600">${tr('Low', 'Bas')}</p>
                    <p class="text-2xl font-bold" id="margin-low">-</p>
                  </div>
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600">${tr('Median', 'Médian')}</p>
                    <p class="text-2xl font-bold" id="margin-mid">-</p>
                  </div>
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600">${tr('High', 'Haut')}</p>
                    <p class="text-2xl font-bold" id="margin-high">-</p>
                  </div>
                </div>
              </div>

              <!-- Comparables -->
              <div>
                <h3 class="text-lg font-semibold mb-3">${tr('Comparables (top 8)', 'Comparables (top 8)')}</h3>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Title', 'Titre')}</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Price', 'Prix')}</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Year', 'Année')}</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Km</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Dept', 'Dépt')}</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">${tr('Score', 'Score')}</th>
                      </tr>
                    </thead>
                    <tbody id="comparables-table-body" class="bg-white divide-y divide-gray-200">
                      <!-- Comparables will be inserted here -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div id="empty-state" class="text-center py-12 text-gray-500">
              <p>${tr('Fill out the form and click "Calculate margin" to see results', 'Remplissez le formulaire et cliquez sur "Calculer la marge" pour voir les résultats')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `

  // Attach form handler
  const form = document.getElementById('auction-form')
  form.addEventListener('submit', handleCalculate)
  
  // Attach URL parse handler
  const parseUrlBtn = document.getElementById('parse-url-btn')
  const auctionUrlInput = document.getElementById('auction-url')
  
  parseUrlBtn.addEventListener('click', handleParseUrl)
  
  // Also parse on Enter key in URL input
  auctionUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleParseUrl()
    }
  })

  // Listing type toggle
  document.getElementById('type-auction').addEventListener('click', () => setListingType('auction'))
  document.getElementById('type-regular').addEventListener('click', () => setListingType('regular'))
  // Default to auction selected visually
  setListingType('auction')
  
  // Attach language toggle handler
  attachLanguageToggle(() => {
    // Reload page when language changes
    window.location.reload()
  })
}

/**
 * Switch between auction and regular listing modes
 */
function setListingType(type) {
  document.getElementById('listing_type').value = type

  const btnAuction = document.getElementById('type-auction')
  const btnRegular = document.getElementById('type-regular')
  const auctionFeeRow = document.getElementById('auction-fee-row')
  const priceLabel = document.getElementById('price-label')
  const formTitle = document.getElementById('form-title')

  if (type === 'auction') {
    btnAuction.className = 'flex-1 py-2 px-4 text-sm font-medium bg-blue-600 text-white transition'
    btnRegular.className = 'flex-1 py-2 px-4 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition'
    auctionFeeRow.classList.remove('hidden')
    priceLabel.textContent = tr('Auction price (SEK) *', 'Prix enchère (SEK) *')
    formTitle.textContent = tr('Auction vehicle information', 'Informations véhicule (enchère)')
  } else {
    btnRegular.className = 'flex-1 py-2 px-4 text-sm font-medium bg-blue-600 text-white transition'
    btnAuction.className = 'flex-1 py-2 px-4 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition'
    auctionFeeRow.classList.add('hidden')
    // Zero out the auction fee when switching to regular
    const auctionFeeInput = document.getElementById('auction_fee_eur')
    if (auctionFeeInput) auctionFeeInput.value = '0'
    priceLabel.textContent = tr('Purchase price (SEK) *', 'Prix d\'achat (SEK) *')
    formTitle.textContent = tr('Vehicle information', 'Informations véhicule')
  }
}

/**
 * Handle URL parsing
 */
async function handleParseUrl() {
  const urlInput = document.getElementById('auction-url')
  const parseBtn = document.getElementById('parse-url-btn')
  const parseStatus = document.getElementById('parse-status')
  const url = urlInput.value.trim()
  
  if (!url) {
    parseStatus.className = 'mt-2 text-sm text-red-600'
    parseStatus.textContent = tr('Please enter a URL', 'Veuillez entrer une URL')
    parseStatus.classList.remove('hidden')
    return
  }
  
  // Show loading
  parseBtn.disabled = true
    parseBtn.textContent = tr('Analyzing...', 'Analyse en cours...')
    parseStatus.className = 'mt-2 text-sm text-blue-600'
    parseStatus.textContent = tr('Analyzing URL...', 'Analyse de l\'URL en cours...')
  parseStatus.classList.remove('hidden')
  
  try {
    const token = getAuthToken()
    
    if (!token) {
      parseStatus.className = 'mt-2 text-sm text-red-600'
        parseStatus.textContent = tr('You must be logged in to analyze a URL. Redirecting to login page...', 'Vous devez être connecté pour analyser une URL. Redirection vers la page de connexion...')
      setTimeout(() => {
        window.location.hash = '#/login?redirect=/auction-margin'
      }, 2000)
      return
    }
    
    const response = await fetch(`${API_BASE}/margin/parse-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url })
    })
    
    if (!response.ok) {
      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        parseStatus.className = 'mt-2 text-sm text-red-600'
        parseStatus.textContent = tr('Session expired. Redirecting to login page...', 'Session expirée. Redirection vers la page de connexion...')
        setTimeout(() => {
          localStorage.removeItem('carindex_token')
          localStorage.removeItem('carindex_user')
          window.location.hash = '#/login?redirect=/auction-margin'
        }, 2000)
        return
      }
      
      let errorMessage = tr('Error analyzing URL', 'Erreur lors de l\'analyse de l\'URL')
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch (e) {
        // If response is not JSON, try to get text
        const text = await response.text()
        errorMessage = text || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    const result = await response.json()
    const auctionData = result.auction_listing
    
    // Auto-detect listing type from source
    const auctionSources = ['kvd', 'swedish_auction', 'auctionet', 'bilwebauktion']
    const detectedType = auctionSources.includes(auctionData.source) ? 'auction' : 'regular'
    setListingType(detectedType)

    // Auto-fill form fields
    fillFormFromAuctionData(auctionData)
    
    // Show success
    parseStatus.className = 'mt-2 text-sm text-green-600'
    parseStatus.textContent = tr('✓ Data extracted successfully', '✓ Données extraites avec succès')
    
  } catch (error) {
    console.error('Error parsing URL:', error)
    parseStatus.className = 'mt-2 text-sm text-red-600'
    // Extract error message properly
    let errorMessage = tr('Error analyzing URL', 'Erreur lors de l\'analyse de l\'URL')
    if (error.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      errorMessage = error.error || error.message || JSON.stringify(error)
    }
    parseStatus.textContent = errorMessage
  } finally {
    parseBtn.disabled = false
    parseBtn.textContent = tr('Analyze', 'Analyser')
  }
}

/**
 * Fill form fields from parsed auction data
 */
function fillFormFromAuctionData(data) {
  // Set hidden fields
  if (data.source) {
    document.getElementById('source').value = data.source
  }
  if (data.source_listing_id) {
    document.getElementById('source_listing_id').value = data.source_listing_id
  }
  if (data.url) {
    document.getElementById('url').value = data.url
  }
  
  // Fill visible fields
  if (data.brand) {
    document.getElementById('brand').value = data.brand
  }
  if (data.model) {
    document.getElementById('model').value = data.model
  }
  if (data.trim) {
    document.getElementById('trim').value = data.trim
  }
  if (data.year) {
    document.getElementById('year').value = data.year
  }
  if (data.mileage) {
    document.getElementById('mileage').value = data.mileage
  }
  if (data.power_hp) {
    document.getElementById('power_hp').value = data.power_hp
  }
  if (data.fuel_type) {
    document.getElementById('fuel_type').value = data.fuel_type
  }
  if (data.transmission) {
    document.getElementById('transmission').value = data.transmission
  }
  if (data.auction_price_sek) {
    document.getElementById('auction_price_sek').value = data.auction_price_sek
  }
  if (data.auction_fee_eur) {
    document.getElementById('auction_fee_eur').value = data.auction_fee_eur
  }
  
  // Fill reconditioning estimate if available
  if (data.estimated_reconditioning_eur) {
    document.getElementById('reconditioning_total_eur').value = data.estimated_reconditioning_eur
  }
  
  // Fill malus-related fields if available
  if (data.co2_g_km_wltp) {
    document.getElementById('co2_g_km_wltp').value = data.co2_g_km_wltp
  }
  if (data.vehicle_category) {
    document.getElementById('vehicle_category').value = data.vehicle_category
  }
  if (data.first_registration_date) {
    // Convert date to YYYY-MM-DD format if needed
    const dateValue = data.first_registration_date instanceof Date 
      ? data.first_registration_date.toISOString().split('T')[0]
      : data.first_registration_date.split('T')[0]
    document.getElementById('first_registration_date').value = dateValue
  }
  if (data.mass_kg) {
    document.getElementById('mass_kg').value = data.mass_kg
  }
  if (data.is_first_registration_in_france !== undefined) {
    document.getElementById('is_first_registration_in_france').checked = data.is_first_registration_in_france !== false
  }
  
  // Set VAT mode automatically
  if (data.vat_deductible !== undefined) {
    const vatMode = data.vat_deductible ? 'vat_reclaimable' : 'margin_scheme'
    const vatModeSelect = document.getElementById('vat_mode')
    if (vatModeSelect) {
      vatModeSelect.value = vatMode
      console.log('VAT mode set in form:', { 
        vat_deductible: data.vat_deductible, 
        vatMode, 
        selectValue: vatModeSelect.value,
        selectDisabled: vatModeSelect.disabled
      })
    }
    const vatModeInfo = document.getElementById('vat-mode-info')
    if (vatModeInfo) {
      vatModeInfo.textContent = data.vat_deductible
        ? tr('✓ Deductible VAT detected (reclaimable VAT)', '✓ TVA déductible détectée (TVA récupérable)')
        : tr('✓ Non-deductible VAT detected (margin scheme)', '✓ TVA non déductible détectée (Régime de marge)')
      vatModeInfo.className = data.vat_deductible 
        ? 'text-xs text-green-600 mt-1 font-medium'
        : 'text-xs text-gray-600 mt-1'
    }
  }
}

/**
 * Handle form submission
 */
async function handleCalculate(e) {
  e.preventDefault()

  const loadingState = document.getElementById('loading-state')
  const errorState = document.getElementById('error-state')
  const resultsContent = document.getElementById('results-content')
  const emptyState = document.getElementById('empty-state')
  const errorMessage = document.getElementById('error-message')

  // Show loading
  loadingState.classList.remove('hidden')
  errorState.classList.add('hidden')
  resultsContent.classList.add('hidden')
  emptyState.classList.add('hidden')

  try {
    // Get form data
    const formData = new FormData(e.target)
    // Get vat_mode from the select element (even if disabled, we can read its value)
    const vatModeSelect = document.getElementById('vat_mode')
    const vatMode = vatModeSelect && vatModeSelect.value ? vatModeSelect.value : (formData.get('vat_mode') || 'margin_scheme')
    const vatDeductible = vatMode === 'vat_reclaimable'
    
    console.log('VAT mode determined:', { 
      vatMode, 
      vatDeductible, 
      selectElement: vatModeSelect,
      selectValue: vatModeSelect?.value,
      selectOptions: vatModeSelect ? Array.from(vatModeSelect.options).map(o => ({ value: o.value, selected: o.selected })) : null,
      formDataVatMode: formData.get('vat_mode')
    })
    
    // Parse malus-related fields
    const co2Value = formData.get('co2_g_km_wltp')
    const co2GkmWltp = co2Value && co2Value !== '' ? parseFloat(co2Value) : null
    
    const firstRegDate = formData.get('first_registration_date') || null
    const regInFRDate = formData.get('registration_in_france_date') || null
    const vehicleCategory = formData.get('vehicle_category') || 'VP'
    const massKg = formData.get('mass_kg') && formData.get('mass_kg') !== '' ? parseFloat(formData.get('mass_kg')) : null
    const isFirstInFR = document.getElementById('is_first_registration_in_france')?.checked !== false

    const auctionListing = {
      source: formData.get('source') || 'other',
      source_listing_id: formData.get('source_listing_id') || formData.get('auction-url') || '',
      brand: formData.get('brand'),
      model: formData.get('model'),
      trim: formData.get('trim') || null,
      year: parseInt(formData.get('year')),
      fuel_type: formData.get('fuel_type') || null,
      transmission: formData.get('transmission') || null,
      power_hp: formData.get('power_hp') ? parseInt(formData.get('power_hp')) : null,
      mileage: parseInt(formData.get('mileage')),
      auction_price_sek: parseFloat(formData.get('auction_price_sek')),
      auction_fee_eur: parseFloat(formData.get('auction_fee_eur')) || 0,
      url: formData.get('url') || formData.get('auction-url') || null,
      vat_deductible: vatDeductible, // Include VAT deductible status
      // Malus-related fields
      co2_g_km_wltp: co2GkmWltp,
      first_registration_date: firstRegDate,
      vehicle_category: vehicleCategory,
      mass_kg: massKg,
      is_first_registration_in_france: isFirstInFR
    }

    const costs = {
      auction_fee_eur: parseFloat(formData.get('auction_fee_eur')) || 0,
      transport_eur: parseFloat(formData.get('transport_eur')) || 1500,
      registration_eur: parseFloat(formData.get('registration_eur')) || 0,
      reconditioning_total_eur: parseFloat(formData.get('reconditioning_total_eur')) || 500,
      vat_mode: vatMode, // Use the value from the select element directly
      registration_in_france_date: regInFRDate // Optional override for malus calculation
    }

    console.log('Sending request with costs:', { costs, vatMode, auctionListing: { ...auctionListing, vat_deductible: auctionListing.vat_deductible } })

    const fxRate = parseFloat(formData.get('fx_rate')) || 0.085
    const evaluationName = formData.get('evaluation-name') || null

    // Make API call
    const token = getAuthToken()
    
    if (!token) {
      const errorMessage = document.getElementById('error-message')
      if (errorMessage) {
        errorMessage.textContent = tr('You must be logged in to calculate a margin. Redirecting to login page...', 'Vous devez être connecté pour calculer une marge. Redirection vers la page de connexion...')
      }
      loadingState.classList.add('hidden')
      errorState.classList.remove('hidden')
      setTimeout(() => {
        window.location.hash = '#/login?redirect=/auction-margin'
      }, 2000)
      return
    }
    
    const response = await fetch(`${API_BASE}/margin/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        auction_listing: auctionListing,
        fx_rate: fxRate,
        costs,
        name: evaluationName
      })
    })

    if (!response.ok) {
      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        const errorMessage = document.getElementById('error-message')
        if (errorMessage) {
          errorMessage.textContent = tr('Session expired. Redirecting to login page...', 'Session expirée. Redirection vers la page de connexion...')
        }
        loadingState.classList.add('hidden')
        errorState.classList.remove('hidden')
        setTimeout(() => {
          localStorage.removeItem('carindex_token')
          localStorage.removeItem('carindex_user')
          window.location.hash = '#/login?redirect=/auction-margin'
        }, 2000)
        return
      }
      
      let errorMessage = tr('Error during calculation', 'Erreur lors du calcul')
      let errorDetails = null
      let errorCode = null
      let errorSuggestions = null
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
        errorDetails = error.details
        errorCode = error.code || (error.error && typeof error.error === 'object' ? error.error.code : null)
        errorSuggestions = error.suggestions || (error.error && typeof error.error === 'object' ? error.error.suggestions : null)
        if (errorCode && !errorMessage.includes(errorCode)) {
          errorMessage += ` (${errorCode})`
        }
      } catch (e) {
        errorMessage = `${tr('Error', 'Erreur')} ${response.status}: ${response.statusText}`
      }
      const error = new Error(errorMessage)
      if (errorDetails || errorCode || errorSuggestions) {
        error.details = typeof errorDetails === 'object' 
          ? { ...errorDetails, code: errorCode, suggestions: errorSuggestions, error: errorMessage }
          : { code: errorCode, suggestions: errorSuggestions, message: errorDetails, error: errorMessage }
      }
      throw error
    }

    const result = await response.json()

    // Display results
    displayResults(result)

    // Show save success message (calculation is always saved)
    // evaluationName is already declared above (line 520)
    const saveSuccessMessage = document.getElementById('save-success-message')
    const saveMessageText = document.getElementById('save-message-text')
    if (saveSuccessMessage) {
      if (evaluationName) {
        saveMessageText.textContent = tr(`Evaluation "${evaluationName}" saved successfully`, `Évaluation "${evaluationName}" sauvegardée avec succès`)
      } else {
        saveMessageText.textContent = tr('Evaluation saved successfully', 'Évaluation sauvegardée avec succès')
      }
      saveSuccessMessage.classList.remove('hidden')
    }

    // Hide loading, show results
    loadingState.classList.add('hidden')
    resultsContent.classList.remove('hidden')
  } catch (error) {
    console.error('Error calculating margin:', error)

    // Extract message: prefer error.details.error (set by the !response.ok block), fall back to error.message
    const errorText = (error?.details?.error) || (typeof error?.message === 'string' ? error.message : null) || tr('An error occurred', 'Une erreur est survenue')
    const errorSuggestions = Array.isArray(error?.details?.suggestions) ? error.details.suggestions : []

    errorMessage.textContent = errorText

    const errorSuggestionsDiv = document.getElementById('error-suggestions')
    const errorSuggestionsList = document.getElementById('error-suggestions-list')
    if (errorSuggestions.length > 0 && errorSuggestionsDiv && errorSuggestionsList) {
      errorSuggestionsList.innerHTML = errorSuggestions.map(s => `<li>${String(s)}</li>`).join('')
      errorSuggestionsDiv.classList.remove('hidden')
    } else if (errorSuggestionsDiv) {
      errorSuggestionsDiv.classList.add('hidden')
    }

    loadingState.classList.add('hidden')
    errorState.classList.remove('hidden')
  }
}

/**
 * Display calculation results
 */
function displayResults(result) {
  // Price estimates
  document.getElementById('price-low').textContent = formatCurrency(Math.round(result.price_estimate.low))
  document.getElementById('price-mid').textContent = formatCurrency(Math.round(result.price_estimate.mid))
  document.getElementById('price-high').textContent = formatCurrency(Math.round(result.price_estimate.high))
  
  // Adjustment details
  const adjustmentDetailsEl = document.getElementById('adjustment-details')
  console.log('Price estimate data:', result.price_estimate) // Debug log
  if (result.price_estimate.adjustment && result.price_estimate.adjustment.details) {
    const adj = result.price_estimate.adjustment
    const details = adj.details
    const pricesBefore = result.price_estimate.pricesBeforeAdjustment
    
    // Show adjustment section
    adjustmentDetailsEl.classList.remove('hidden')
    
    // Prices before adjustment
    if (pricesBefore) {
      document.getElementById('adjustment-before-price').innerHTML = `
        <div class="text-xs text-gray-600 mb-1">${tr('Median price of comparables:', 'Prix médian des comparables:')} <span class="font-semibold">${formatCurrency(pricesBefore.mid)}</span></div>
      `
    }
    
    // Year adjustment
    const yearSign = details.yearDiff >= 0 ? '+' : ''
    const yearAdjustmentSign = details.yearAdjustment >= 0 ? '+' : ''
    const yearColor = details.yearAdjustment >= 0 ? 'text-green-700' : 'text-red-700'
    document.getElementById('adjustment-year-detail').innerHTML = `
      <div class="flex justify-between">
        <span>${tr('Year difference:', 'Différence année:')}</span>
        <span class="font-semibold ${yearColor}">
          ${yearSign}${Math.round(details.yearDiff)} ${tr('years', 'ans')} → ${yearAdjustmentSign}${formatCurrency(details.yearAdjustment)}
        </span>
      </div>
      <div class="text-xs text-gray-600 ml-4">
        (${tr('Vehicle:', 'Véhicule:')} ${details.auctionYear} vs ${tr('Comparables median:', 'Comparables médian:')} ${details.medianComparableYear})
      </div>
    `
    
    // Mileage adjustment
    const mileageSign = details.mileageDiff >= 0 ? '+' : ''
    const mileageAdjustmentSign = details.mileageAdjustment >= 0 ? '+' : ''
    const mileageColor = details.mileageAdjustment >= 0 ? 'text-green-700' : 'text-red-700'
    document.getElementById('adjustment-mileage-detail').innerHTML = `
      <div class="flex justify-between">
        <span>${tr('Mileage difference:', 'Différence kilométrage:')}</span>
        <span class="font-semibold ${mileageColor}">
          ${mileageSign}${details.mileageDiff.toLocaleString('fr-FR')} km → ${mileageAdjustmentSign}${details.mileageAdjustment.toLocaleString('fr-FR')} €
        </span>
      </div>
      <div class="text-xs text-gray-600 ml-4">
        (${tr('Vehicle:', 'Véhicule:')} ${formatNumber(details.auctionMileage)} km vs ${tr('Comparables median:', 'Comparables médian:')} ${formatNumber(details.medianComparableMileage)} km)
      </div>
    `
    
    // Total adjustment
    const totalAdjustmentSign = adj.amount >= 0 ? '+' : ''
    const totalColor = adj.amount >= 0 ? 'text-green-700' : 'text-red-700'
    document.getElementById('adjustment-total').textContent = `${totalAdjustmentSign}${formatCurrency(adj.amount)}`
    document.getElementById('adjustment-total').className = `font-bold ${totalColor}`
    
    // Price after adjustment
    if (pricesBefore) {
      document.getElementById('adjustment-after-price').innerHTML = `
        <div class="text-xs text-gray-600">
          ${tr('Final estimated price (median):', 'Prix estimé final (médian):')} <span class="font-semibold">${formatCurrency(pricesBefore.mid)}</span> 
          ${totalAdjustmentSign}<span class="font-semibold ${totalColor}">${formatCurrency(Math.abs(adj.amount))}</span> 
          = <span class="font-bold text-lg">${formatCurrency(result.price_estimate.mid)}</span>
        </div>
      `
    }
    
    if (adj.capped) {
      const warningEl = document.createElement('div')
      warningEl.className = 'mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded'
      warningEl.textContent = `⚠️ ${tr('Adjustment capped at ±20% of median price (original adjustment:', 'Ajustement plafonné à ±20% du prix médian (ajustement original:')} ${formatCurrency(adj.originalAmount)})`
      adjustmentDetailsEl.querySelector('.space-y-2').appendChild(warningEl)
    }
  } else {
    adjustmentDetailsEl.classList.add('hidden')
  }

  // Costs breakdown
  const costsBreakdown = document.getElementById('costs-breakdown')
  const costs = result.costs_breakdown
  
  // Show VAT deduction if applicable
  let auctionPriceDisplay = formatCurrency(costs.auction_price_eur)
  let vatInfo = ''
  if (costs.vat_mode === 'vat_reclaimable' && costs.swedish_vat_amount_eur) {
    const vatAmountEur = formatCurrency(costs.swedish_vat_amount_eur)
    const originalPriceEur = formatCurrency((costs.auction_price_sek || 0) * (costs.fx_rate || 0.085))
    vatInfo = `<div class="text-xs text-gray-500 mt-1 ml-4">(${tr('Incl. VAT', 'Prix TTC')}: ${originalPriceEur} € - ${tr('Swedish VAT 25%', 'TVA suédoise 25%')}: ${vatAmountEur} € ${tr('reclaimable', 'récupérable')})</div>`
  }
  
  costsBreakdown.innerHTML = `
    <div class="flex justify-between">
      <span>${tr('Auction price (EUR)', 'Prix enchère (EUR)')}${costs.vat_mode === 'vat_reclaimable' ? ' (HT)' : ''}:</span>
      <span class="font-semibold">${auctionPriceDisplay} €</span>
    </div>
    ${vatInfo}
    <div class="flex justify-between">
      <span>${tr('Auction fee:', 'Frais enchère:')} </span>
      <span class="font-semibold">${formatCurrency(costs.auction_fee_eur)}</span>
    </div>
    <div class="flex justify-between">
      <span>${tr('Transport:', 'Transport:')}</span>
      <span class="font-semibold">${formatCurrency(costs.transport_eur)}</span>
    </div>
    <div class="flex justify-between">
      <span>${tr('Registration:', 'Immatriculation:')}</span>
      <span class="font-semibold">${formatCurrency(costs.registration_eur)}</span>
    </div>
    <div class="flex justify-between">
      <span>${tr('Total reconditioning:', 'Réconditionnement total:')}</span>
      <span class="font-semibold">${formatCurrency(costs.reconditioning_total_eur)}</span>
    </div>
    ${costs.malus_eur !== undefined && costs.malus_eur > 0 ? `
    <div class="flex justify-between">
      <span>${tr('Ecological malus:', 'Malus écologique:')}</span>
      <span class="font-semibold text-red-600">${formatCurrency(costs.malus_eur)}</span>
    </div>
    ${costs.malus_debug ? `
    <div class="mt-2 p-2 bg-red-50 rounded text-xs">
      <div class="font-semibold text-red-800 mb-1">${tr('Malus details:', 'Détails du malus:')}</div>
      <div class="text-red-700 space-y-1">
        ${costs.malus_debug.co2_table_version ? `<div>${tr('Table:', 'Table:')} ${costs.malus_debug.co2_table_version}</div>` : ''}
        ${costs.malus_debug.base_malus_co2 > 0 ? `<div>${tr('Base CO₂ malus:', 'Malus CO₂ de base:')} ${formatCurrency(costs.malus_debug.base_malus_co2)}</div>` : ''}
        ${costs.malus_debug.years_started > 0 ? `<div>${tr('Vehicle age:', 'Âge du véhicule:')} ${costs.malus_debug.years_started} ${tr('yr(s)', 'an(s)')} → ${tr('Depreciation:', 'Décote:')} ${((1 - costs.malus_debug.decote_factor) * 100).toFixed(0)}%</div>` : ''}
        ${costs.malus_debug.notes && costs.malus_debug.notes.length > 0 ? `
        <div class="mt-1 pt-1 border-t border-red-200">
          ${costs.malus_debug.notes.map(note => `<div>• ${note}</div>`).join('')}
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}
    ` : ''}
    <div class="flex justify-between border-t pt-2 mt-2">
      <span class="font-semibold">${tr('Total:', 'Total:')}</span>
      <span class="font-bold text-lg">${formatCurrency(costs.total_eur)}</span>
    </div>
  `

  // Margins
  const marginLow = result.margin.low
  const marginMid = result.margin.mid
  const marginHigh = result.margin.high

  const marginLowEl = document.getElementById('margin-low')
  const marginMidEl = document.getElementById('margin-mid')
  const marginHighEl = document.getElementById('margin-high')

  marginLowEl.textContent = formatCurrency(marginLow)
  marginLowEl.className = `text-2xl font-bold ${marginLow >= 0 ? 'text-green-600' : 'text-red-600'}`

  marginMidEl.textContent = formatCurrency(marginMid)
  marginMidEl.className = `text-2xl font-bold ${marginMid >= 0 ? 'text-green-600' : 'text-red-600'}`

  marginHighEl.textContent = formatCurrency(marginHigh)
  marginHighEl.className = `text-2xl font-bold ${marginHigh >= 0 ? 'text-green-600' : 'text-red-600'}`

  // Comparables table
  const tableBody = document.getElementById('comparables-table-body')
  if (result.comparables && result.comparables.length > 0) {
    tableBody.innerHTML = result.comparables.map(c => `
      <tr>
        <td class="px-4 py-2 text-sm">
          <a href="${c.url}" target="_blank" class="text-blue-600 hover:underline">${c.title}</a>
        </td>
        <td class="px-4 py-2 text-sm">${formatCurrency(c.price)}</td>
        <td class="px-4 py-2 text-sm">${c.year}</td>
        <td class="px-4 py-2 text-sm">${formatNumber(c.mileage)} km</td>
        <td class="px-4 py-2 text-sm">${c.dept || '-'}</td>
        <td class="px-4 py-2 text-sm">
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
            ${(c.match_score * 100).toFixed(0)}%
          </span>
        </td>
      </tr>
    `).join('')
  } else {
    tableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-2 text-sm text-gray-500 text-center">' + tr('No comparables found', 'Aucun comparable trouvé') + '</td></tr>'
  }
}
