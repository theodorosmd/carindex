import { tr, renderLanguageToggle, attachLanguageToggle, getLang, formatNumber, formatCurrency, capitalize } from '../utils/i18n.js'

export function renderListingsSearch() {
  const app = document.getElementById('app')
  
  app.innerHTML = `
    <!-- Navigation -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <a href="/" class="flex items-center space-x-2">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xl">C</span>
            </div>
            <span class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Carindex</span>
          </a>
          <div class="flex items-center space-x-4">
            ${renderLanguageToggle()}
            <a href="/" class="text-gray-600 hover:text-blue-600 transition">${tr('Home', 'Accueil')}</a>
            <a href="/pricing" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">${tr('Free Trial', 'Essai gratuit')}</a>
          </div>
        </div>
      </nav>
    </header>

    <!-- Search Section -->
    <section class="bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
      <div class="container mx-auto px-6">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">${tr('Search for a vehicle', 'Rechercher un véhicule')}</h1>
          <p class="text-gray-600 mb-8">${tr('Browse millions of listings from leboncoin, mobile.de, AutoScout24 and more', 'Parcourez des millions d\'annonces depuis leboncoin, mobile.de, AutoScout24 et plus')}</p>
          
          <!-- Search Form -->
          <div class="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <form id="search-form" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Brand -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">${tr('Brand', 'Marque')}</label>
                <select id="brand" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">${tr('All brands', 'Toutes les marques')}</option>
                  <option value="BMW">BMW</option>
                  <option value="Mercedes-Benz">Mercedes-Benz</option>
                  <option value="Audi">Audi</option>
                  <option value="Volkswagen">Volkswagen</option>
                  <option value="Peugeot">Peugeot</option>
                  <option value="Renault">Renault</option>
                  <option value="Citroën">Citroën</option>
                  <option value="Ford">Ford</option>
                  <option value="Opel">Opel</option>
                  <option value="Toyota">Toyota</option>
                </select>
              </div>
              
              <!-- Model -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">${tr('Model', 'Modèle')}</label>
                <input type="text" id="model" placeholder="${tr('Ex: 320d, C-Class...', 'Ex: 320d, C-Class...')}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              
              <!-- Price Range -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">${tr('Max price', 'Prix max')}</label>
                <input type="number" id="max-price" placeholder="${tr('Ex: 30000', 'Ex: 30000')}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              
              <!-- Country -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">${tr('Country', 'Pays')}</label>
                <select id="country" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">${tr('All countries', 'Tous les pays')}</option>
                  <option value="FR">France</option>
                  <option value="SE">Suède</option>
                  <option value="DE">Allemagne</option>
                  <option value="ES">Espagne</option>
                  <option value="IT">Italie</option>
                  <option value="BE">Belgique</option>
                  <option value="NL">Pays-Bas</option>
                  <option value="AT">Autriche</option>
                  <option value="CH">Suisse</option>
                </select>
              </div>
              
              <!-- Year -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">${tr('Min year', 'Année min')}</label>
                <input type="number" id="min-year" placeholder="${tr('Ex: 2018', 'Ex: 2018')}" min="1990" max="2024" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              
              <!-- Mileage -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">${tr('Max mileage', 'Kilométrage max')}</label>
                <input type="number" id="max-mileage" placeholder="${tr('Ex: 100000', 'Ex: 100000')}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              
              <!-- Fuel Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">${tr('Fuel type', 'Carburant')}</label>
                <select id="fuel-type" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">${tr('All', 'Tous')}</option>
                  <option value="diesel">Diesel</option>
                  <option value="petrol">${tr('Petrol', 'Essence')}</option>
                  <option value="electric">${tr('Electric', 'Électrique')}</option>
                  <option value="hybrid">${tr('Hybrid', 'Hybride')}</option>
                </select>
              </div>
              
              <!-- Search Button -->
              <div class="flex items-end">
                <button type="submit" class="w-full px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl">
                  ${tr('Search', 'Rechercher')}
                </button>
              </div>
            </form>
          </div>
          
          <!-- Quick Filters -->
          <div class="flex flex-wrap gap-2 mb-6">
            <button class="quick-filter px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium" data-brand="BMW">BMW</button>
            <button class="quick-filter px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium" data-brand="Mercedes-Benz">Mercedes</button>
            <button class="quick-filter px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium" data-brand="Audi">Audi</button>
            <button class="quick-filter px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium" data-brand="Volkswagen">Volkswagen</button>
            <button class="quick-filter px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium" data-price="20000">${tr('Less than 20k€', 'Moins de 20k€')}</button>
            <button class="quick-filter px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium" data-year="2020">${tr('Recent (2020+)', 'Récent (2020+)')}</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Results Section -->
    <section class="py-8 bg-white">
      <div class="container mx-auto px-6">
        <div class="max-w-7xl mx-auto">
          <!-- Results Header -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-2xl font-bold text-gray-900" id="results-count">${tr('0 listings found', '0 annonces trouvées')}</h2>
              <p class="text-gray-600 text-sm" id="results-info">${tr('Use filters to refine your search', 'Utilisez les filtres pour affiner votre recherche')}</p>
            </div>
            <div class="flex items-center space-x-4">
              <select id="sort-by" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="date">${tr('Most recent', 'Plus récent')}</option>
                <option value="price-asc">${tr('Price ascending', 'Prix croissant')}</option>
                <option value="price-desc">${tr('Price descending', 'Prix décroissant')}</option>
                <option value="mileage-asc">${tr('Mileage ascending', 'Kilométrage croissant')}</option>
              </select>
            </div>
          </div>
          
          <!-- Results Grid -->
          <div id="results-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Results will be inserted here -->
            <div class="col-span-full text-center py-12">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <p class="mt-4 text-gray-600">${tr('Start your search to see results', 'Commencez votre recherche pour voir les résultats')}</p>
            </div>
          </div>
          
          <!-- Pagination -->
          <div id="pagination" class="mt-8 flex justify-center items-center space-x-2 hidden">
            <!-- Pagination will be inserted here -->
          </div>
        </div>
      </div>
    </section>

    <!-- Listing Detail Modal -->
    <div id="listing-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h3 class="text-2xl font-bold text-gray-900">${tr('Listing details', 'Détails de l\'annonce')}</h3>
          <button id="close-modal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div id="modal-content" class="p-6">
          <!-- Modal content will be inserted here -->
        </div>
      </div>
    </div>
  `
  
  // Initialize search functionality after DOM is ready
  setTimeout(() => {
    initializeSearch()
    attachLanguageToggle(() => {
      // Reload page when language changes
      window.location.reload()
    })
  }, 100)
}

function initializeSearch() {
  const searchForm = document.getElementById('search-form')
  const resultsContainer = document.getElementById('results-container')
  const resultsCount = document.getElementById('results-count')
  const quickFilters = document.querySelectorAll('.quick-filter')
  const sortSelect = document.getElementById('sort-by')
  const listingModal = document.getElementById('listing-modal')
  const closeModal = document.getElementById('close-modal')
  
  let currentPage = 1
  let currentFilters = {}
  
  // Handle form submission
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    currentPage = 1
    currentFilters = getFilters()
    await searchListings(currentFilters, currentPage)
  })
  
  // Handle quick filters
  quickFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.brand) {
        document.getElementById('brand').value = btn.dataset.brand
      }
      if (btn.dataset.price) {
        document.getElementById('max-price').value = btn.dataset.price
      }
      if (btn.dataset.year) {
        document.getElementById('min-year').value = btn.dataset.year
      }
      currentFilters = getFilters()
      currentPage = 1
      searchListings(currentFilters, currentPage)
    })
  })
  
  // Handle sort
  sortSelect.addEventListener('change', () => {
    if (Object.keys(currentFilters).length > 0) {
      searchListings(currentFilters, currentPage)
    }
  })
  
  // Handle modal
  closeModal.addEventListener('click', () => {
    listingModal.classList.add('hidden')
  })
  
  listingModal.addEventListener('click', (e) => {
    if (e.target === listingModal) {
      listingModal.classList.add('hidden')
    }
  })
  
  // Get filters from form
  function getFilters() {
    const countryValue = document.getElementById('country').value
    const filters = {
      brand: document.getElementById('brand').value,
      model: document.getElementById('model').value,
      max_price: document.getElementById('max-price').value,
      min_year: document.getElementById('min-year').value,
      max_mileage: document.getElementById('max-mileage').value,
      fuel_type: document.getElementById('fuel-type').value,
      sort: document.getElementById('sort-by').value
    }

    if (countryValue) filters.country = countryValue

    return filters
  }
  
  // Search listings
  async function searchListings(filters, page = 1) {
    try {
      resultsContainer.innerHTML = '<div class="col-span-full text-center py-12"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p class="mt-4 text-gray-600">Recherche en cours...</p></div>'
      
      // Build query params
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      params.append('limit', '24')
      params.append('offset', ((page - 1) * 24).toString())
      
      // Call API (for now, use mock data)
      const apiUrl = '/api/v1/listings/search?' + params.toString()
      try {
        const response = await fetch(apiUrl)
        const data = await response.json()
        displayResults(data.listings || [], data.total || 0, page)
      } catch (error) {
        // Fallback to mock data for demo
        const mockData = generateMockListings(filters)
        displayResults(mockData, mockData.length, page)
      }
    } catch (error) {
      console.error('Search error:', error)
      const mockData = generateMockListings(filters)
      displayResults(mockData, mockData.length, page)
    }
  }
  
  // Display results
  function displayResults(listings, total, page) {
    resultsCount.textContent = formatNumber(total) + ' ' + tr('listings found', 'annonces trouvées')
    
    if (listings.length === 0) {
      resultsContainer.innerHTML = '<div class="col-span-full text-center py-12"><svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class="mt-4 text-gray-600">' + tr('No results found', 'Aucun résultat trouvé') + '</p><p class="text-sm text-gray-500 mt-2">' + tr('Try modifying your search criteria', 'Essayez de modifier vos critères de recherche') + '</p></div>'
      return
    }
    
    resultsContainer.innerHTML = listings.map(listing => createListingCard(listing)).join('')
    
    // Add click handlers
    document.querySelectorAll('.listing-card').forEach(card => {
      card.addEventListener('click', () => {
        const listingId = card.dataset.id
        const listing = listings.find(l => l.id === listingId)
        if (listing) {
          showListingDetails(listingId, listing)
        }
      })
    })
    
    // Update pagination
    updatePagination(total, page)
  }
  
  // Create listing card
  function createListingCard(listing) {
    const price = formatCurrency(listing.price)
    const mileage = formatNumber(listing.mileage)
    const sourceIcon = getSourceIcon(listing.source)
    const sourceName = getSourceName(listing.source)
    const marketPrice = listing.market_price ? formatCurrency(listing.market_price) : null
    const postedDate = formatDate(listing.posted_date)
    const imageUrl = listing.images && listing.images.length > 0 ? listing.images[0] : null
    const hasImage = !!imageUrl
    
    let cardHTML = '<div class="listing-card bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-100 overflow-hidden" data-id="' + listing.id + '">'
    
    // Image section
    cardHTML += '<div class="relative aspect-[16/10] bg-gray-200 overflow-hidden">'
    if (hasImage) {
      cardHTML += '<img src="' + imageUrl + '" alt="' + capitalize(listing.brand) + ' ' + capitalize(listing.model) + '" class="w-full h-full object-cover" loading="lazy" decoding="async">'
    } else {
      cardHTML += '<div class="w-full h-full flex items-center justify-center text-gray-400"><svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
    }
    
    // Source badge
    cardHTML += '<div class="absolute top-2 right-2 flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium">'
    cardHTML += '<span>' + sourceIcon + '</span>'
    cardHTML += '<span class="text-gray-700">' + sourceName + '</span>'
    cardHTML += '</div>'
    
    // Market price badge
    if (marketPrice) {
      cardHTML += '<div class="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-semibold">'
      cardHTML += tr('Market price:', 'Prix marché:') + ' ' + marketPrice
      cardHTML += '</div>'
    }
    
    cardHTML += '</div>'
    
    // Content section
    cardHTML += '<div class="p-4">'
    cardHTML += '<h3 class="text-lg font-bold text-gray-900 mb-1">' + listing.year + ' ' + capitalize(listing.brand) + ' ' + capitalize(listing.model) + '</h3>'
    cardHTML += '<div class="flex items-center justify-between mb-3">'
    cardHTML += '<span class="text-2xl font-bold text-blue-600">' + price + '</span>'
    if (listing.confidence_index) {
      cardHTML += '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">' + tr('Confidence:', 'Confiance:') + ' ' + listing.confidence_index + '%</span>'
    }
    cardHTML += '</div>'
    
    // Details grid
    cardHTML += '<div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">'
    cardHTML += '<div class="flex items-center space-x-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>' + listing.year + '</span></div>'
    cardHTML += '<div class="flex items-center space-x-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span>' + mileage + ' km</span></div>'
    cardHTML += '<div class="flex items-center space-x-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><span>' + (listing.location?.city || 'N/A') + '</span></div>'
    cardHTML += '<div class="flex items-center space-x-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>' + (listing.location?.country || 'FR') + '</span></div>'
    cardHTML += '</div>'
    
    // Footer
    const sourcesCount = (listing.sources && listing.sources.length) || 0
    cardHTML += '<div class="flex items-center justify-between pt-3 border-t border-gray-100">'
    cardHTML += '<span class="text-xs text-gray-500">' + tr('Published', 'Publié') + ' ' + postedDate + (sourcesCount > 1 ? ' · ' + sourcesCount + ' ' + tr('sites', 'sites') : '') + '</span>'
    const cardUrl = (listing.sources && listing.sources[0] && listing.sources[0].url) ? listing.sources[0].url : listing.url
    if (cardUrl) cardHTML += '<a href="' + cardUrl + '" target="_blank" class="text-blue-600 hover:text-blue-700 text-sm font-medium" onclick="event.stopPropagation()">' + tr('View listing', 'Voir l\'annonce') + ' →</a>'
    cardHTML += '</div>'
    cardHTML += '</div>'
    cardHTML += '</div>'
    
    return cardHTML
  }
  
  // Show listing details modal
  function showListingDetails(listingId, listing) {
    const modalContent = document.getElementById('modal-content')
    const modal = document.getElementById('listing-modal')
    
    const price = formatCurrency(listing.price)
    const marketPrice = listing.market_price ? formatCurrency(listing.market_price) : null
    const mileage = formatNumber(listing.mileage)
    const mainImage = listing.images?.[0] || 'https://via.placeholder.com/600x400'
    const otherImages = listing.images?.slice(1, 4) || []
    
    let modalHTML = '<div class="grid md:grid-cols-2 gap-6">'
    modalHTML += '<div>'
    modalHTML += '<div class="rounded-xl overflow-hidden mb-4"><img src="' + mainImage + '" alt="' + listing.brand + ' ' + listing.model + '" class="w-full h-64 object-cover"></div>'
    if (otherImages.length > 0) {
      modalHTML += '<div class="grid grid-cols-3 gap-2">'
      otherImages.forEach(img => {
        modalHTML += '<img src="' + img + '" alt="" class="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75">'
      })
      modalHTML += '</div>'
    }
    modalHTML += '</div>'
    
    modalHTML += '<div>'
    modalHTML += '<h2 class="text-3xl font-bold text-gray-900 mb-2">' + listing.year + ' ' + capitalize(listing.brand) + ' ' + capitalize(listing.model) + '</h2>'
    modalHTML += '<div class="text-4xl font-bold text-blue-600 mb-4">' + price + '</div>'
    
    if (marketPrice) {
      modalHTML += '<div class="bg-blue-50 rounded-lg p-4 mb-4">'
      modalHTML += '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">' + tr('Estimated market price', 'Prix marché estimé') + '</span><span class="text-lg font-bold text-blue-600">' + marketPrice + '</span></div>'
      if (listing.confidence_index) {
        modalHTML += '<div class="mt-2"><div class="flex items-center justify-between text-xs text-gray-600 mb-1"><span>' + tr('Confidence index', 'Indice de confiance') + '</span><span>' + listing.confidence_index + '%</span></div>'
        modalHTML += '<div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-green-500 h-2 rounded-full" style="width: ' + listing.confidence_index + '%"></div></div></div>'
      }
      modalHTML += '</div>'
    }
    
    modalHTML += '<div class="grid grid-cols-2 gap-4 mb-6">'
    modalHTML += '<div class="bg-gray-50 rounded-lg p-3"><div class="text-sm text-gray-600">' + tr('Year', 'Année') + '</div><div class="text-lg font-semibold">' + listing.year + '</div></div>'
    modalHTML += '<div class="bg-gray-50 rounded-lg p-3"><div class="text-sm text-gray-600">' + tr('Mileage', 'Kilométrage') + '</div><div class="text-lg font-semibold">' + mileage + ' km</div></div>'
    modalHTML += '<div class="bg-gray-50 rounded-lg p-3"><div class="text-sm text-gray-600">' + tr('Fuel type', 'Carburant') + '</div><div class="text-lg font-semibold">' + (listing.fuel_type || 'N/A') + '</div></div>'
    modalHTML += '<div class="bg-gray-50 rounded-lg p-3"><div class="text-sm text-gray-600">' + tr('Location', 'Localisation') + '</div><div class="text-lg font-semibold">' + (listing.location?.city || 'N/A') + ', ' + (listing.location?.country || 'FR') + '</div></div>'
    modalHTML += '</div>'
    
    const modalSources = (listing.sources && listing.sources.length > 0 ? listing.sources.filter(function (s) { return s.url }) : null) || (listing.url ? [{ platform: listing.source_platform || listing.source, url: listing.url }] : [])
    const linkDisclaimer = '<p class="mt-2 text-xs text-gray-500">' + tr('The seller may have removed this listing. If the link shows an error, the car may no longer be available.', 'Le vendeur peut avoir retiré cette annonce. Si le lien affiche une erreur, le véhicule n\'est peut-être plus disponible.') + '</p>'
    modalHTML += '<div class="flex flex-col space-y-2">'
    if (modalSources.length === 1) {
      modalHTML += '<a href="' + modalSources[0].url + '" target="_blank" rel="noopener noreferrer" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center">' + tr('View original listing', 'Voir l\'annonce originale') + '</a>' + linkDisclaimer
    } else if (modalSources.length > 1) {
      modalHTML += '<div class="text-sm font-medium text-gray-700 mb-1">' + tr('Contact seller', 'Contacter le vendeur') + ' :</div>'
      modalSources.forEach(function (s) {
        modalHTML += '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center"><span>' + getSourceName(s.platform) + '</span><span>→</span></a>'
      })
      modalHTML += linkDisclaimer
    }
    modalHTML += '<div class="flex space-x-3"><button class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button></div>'
    modalHTML += '</div>'
    modalHTML += '</div>'
    modalHTML += '</div>'
    
    modalContent.innerHTML = modalHTML
    modal.classList.remove('hidden')
    modal.classList.add('flex')
  }
  
  // Update pagination
  function updatePagination(total, page) {
    const pagination = document.getElementById('pagination')
    const totalPages = Math.ceil(total / 24)
    
    if (totalPages <= 1) {
      pagination.classList.add('hidden')
      return
    }
    
    pagination.classList.remove('hidden')
    
    let paginationHTML = ''
    
    // Previous button
    if (page > 1) {
      paginationHTML += '<button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onclick="window.changePage(' + (page - 1) + ')">' + tr('Previous', 'Précédent') + '</button>'
    } else {
      paginationHTML += '<button disabled class="px-4 py-2 border border-gray-300 rounded-lg opacity-50 cursor-not-allowed">' + tr('Previous', 'Précédent') + '</button>'
    }
    
    // Page numbers
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      const isActive = i === page
      paginationHTML += '<button class="px-4 py-2 border border-gray-300 rounded-lg ' + (isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-50') + '" onclick="window.changePage(' + i + ')">' + i + '</button>'
    }
    
    // Next button
    if (page < totalPages) {
      paginationHTML += '<button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onclick="window.changePage(' + (page + 1) + ')">' + tr('Next', 'Suivant') + '</button>'
    } else {
      paginationHTML += '<button disabled class="px-4 py-2 border border-gray-300 rounded-lg opacity-50 cursor-not-allowed">' + tr('Next', 'Suivant') + '</button>'
    }
    
    pagination.innerHTML = paginationHTML
  }
  
  // Global function for pagination
  window.changePage = function(newPage) {
    currentPage = newPage
    searchListings(currentFilters, currentPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  // Helper functions
  function getSourceIcon(source) {
    const icons = {
      'leboncoin': '🔵',
      'mobile.de': '🟢',
      'autoscout24': '🟠'
    }
    return icons[source] || '📋'
  }
  
  function getSourceName(source) {
    const names = {
      'leboncoin': 'LeBonCoin',
      'mobile.de': 'mobile.de',
      'autoscout24': 'AutoScout24',
      'gaspedaal': 'Gaspedaal.nl',
      'marktplaats': 'Marktplaats.nl',
      'bilweb': 'Bilweb.se',
      'bytbil': 'Bytbil.com',
      'blocket': 'Blocket.se',
      'coches.net': 'Coches.net',
      'finn': 'FINN.no',
      'otomoto': 'OtoMoto.pl',
      '2ememain': '2emain.be',
      'largus': "L'Argus",
      'lacentrale': 'La Centrale',
      'subito': 'Subito.it'
    }
    return names[source] || source
  }
  
  function formatDate(dateString) {
    if (!dateString) return tr('Recently', 'Récemment')
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return tr("Today", "Aujourd'hui")
    if (days === 1) return tr("Yesterday", "Hier")
    if (days < 7) return tr("days ago", "Il y a ") + days + " " + tr("days", "jours")
    const lang = getLang()
    return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')
  }
  
  // Generate mock listings for demo
  function generateMockListings(filters) {
    const brands = filters.brand ? [filters.brand] : ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Peugeot', 'Renault']
    const models = {
      'BMW': ['320d', '520d', 'X3', 'X5', '118d'],
      'Mercedes-Benz': ['C-Class', 'E-Class', 'A-Class', 'GLC', 'CLA'],
      'Audi': ['A3', 'A4', 'A5', 'Q5', 'Q7'],
      'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Touran', 'Polo'],
      'Peugeot': ['208', '308', '3008', '5008', '2008'],
      'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Scenic']
    }
    
    const sources = ['leboncoin', 'mobile.de', 'autoscout24']
    const cities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice']
    const fuelTypes = ['diesel', 'petrol', 'electric', 'hybrid']
    
    const listings = []
    for (let i = 0; i < 24; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)]
      const model = models[brand]?.[Math.floor(Math.random() * models[brand].length)] || 'Modèle'
      const year = (filters.min_year ? parseInt(filters.min_year) : 2018) + Math.floor(Math.random() * 6)
      const mileage = filters.max_mileage ? Math.min(parseInt(filters.max_mileage), 150000) : 10000 + Math.floor(Math.random() * 150000)
      const maxPrice = filters.max_price ? parseInt(filters.max_price) : 50000
      const price = maxPrice - Math.floor(Math.random() * 20000)
      
      listings.push({
        id: 'listing-' + i,
        brand,
        model,
        year,
        mileage,
        price,
        location: {
          city: cities[Math.floor(Math.random() * cities.length)],
          country: filters.country || 'FR'
        },
        source: sources[Math.floor(Math.random() * sources.length)],
        posted_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/listing/' + i,
        market_price: price + (Math.random() * 2000 - 1000),
        confidence_index: 70 + Math.floor(Math.random() * 25),
        fuel_type: fuelTypes[Math.floor(Math.random() * fuelTypes.length)],
        images: ['https://via.placeholder.com/600x400?text=' + brand + '+' + model]
      })
    }
    
    return listings
  }
}








