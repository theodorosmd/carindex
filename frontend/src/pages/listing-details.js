import { tr, renderLanguageToggle, attachLanguageToggle, formatCurrency, formatNumber, getLang } from '../utils/i18n.js'

// API Cache utility
const apiCache = {
  cache: new Map(),
  maxAge: 5 * 60 * 1000, // 5 minutes
  
  generateKey(url, params) {
    return url + '?' + params.toString()
  },
  
  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }
    return item.data
  },
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }
}

export function renderListingDetails() {
  const path = window.location.pathname
  const hash = window.location.hash
  const listingIdFromPath = path.startsWith('/listing/') ? path.split('/listing/')[1]?.split('?')[0] : null
  const listingIdFromHash = hash.split('/listing/')[1]?.split('?')[0]
  const listingId = listingIdFromPath || listingIdFromHash
  
  if (!listingId) {
    window.location.href = '/search'
    return
  }
  
  document.body.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <a href="/" class="flex items-center space-x-2">
              <span class="text-xl sm:text-2xl font-bold text-blue-600">Carindex</span>
            </a>
            <nav class="flex items-center space-x-2 sm:space-x-4">
              <a href="/search" class="hidden sm:inline text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">${tr('Search', 'Recherche')}</a>
              ${renderLanguageToggle()}
              <button onclick="window.safeBack('/search')" class="px-3 sm:px-4 py-2 text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">
                <span class="hidden sm:inline">← ${tr('Back', 'Retour')}</span>
                <span class="sm:hidden">←</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <!-- Loading State -->
      <div id="loading-state" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="mt-4 text-gray-600">${tr('Loading details...', 'Chargement des détails...')}</p>
        </div>
      </div>

      <!-- Error State -->
      <div id="error-state" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">${tr('Loading error', 'Erreur de chargement')}</h3>
          <p class="mt-2 text-sm text-gray-500" id="error-message"></p>
          <div class="mt-6">
            <button onclick="window.safeBack('/search')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              ${tr('Back to search', 'Retour à la recherche')}
            </button>
          </div>
        </div>
      </div>

      <!-- Listing Details Content -->
      <div id="listing-content" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Content will be inserted here -->
      </div>
    </div>
  `
  
  attachLanguageToggle(() => window.location.reload())
  // Load listing details
  loadListingDetails(listingId)
}

async function loadListingDetails(listingId) {
  const loadingState = document.getElementById('loading-state')
  const errorState = document.getElementById('error-state')
  const listingContent = document.getElementById('listing-content')
  const errorMessage = document.getElementById('error-message')
  
  try {
    // Try to fetch from API
    const response = await fetch(`/api/v1/listings/${listingId}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(tr('Listing not found', 'Annonce introuvable'))
      }
      throw new Error(`Erreur ${response.status}: ${response.statusText}`)
    }
    
    const listing = await response.json()
    
    // Hide loading, show content
    loadingState.classList.add('hidden')
    listingContent.classList.remove('hidden')
    
    // Render listing details
    renderListingContent(listing)
    
  } catch (error) {
    console.error('Error loading listing:', error)
    loadingState.classList.add('hidden')
    errorState.classList.remove('hidden')
    errorMessage.textContent = error.message || 'Une erreur est survenue lors du chargement de l\'annonce.'
  }
}

// Extract data from specifications if main fields are empty
function extractFromSpecifications(listing) {
  // Handle both object and array formats for specifications
  let specs = listing.specifications || {}
  
  // If specifications is an array, convert to object
  if (Array.isArray(specs)) {
    const specsObj = {}
    specs.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        // Handle {key: "Fuel", value: "Gasoline"} format
        if (item.key && item.value !== undefined) {
          specsObj[item.key] = item.value
        } else {
          // Handle {Fuel: "Gasoline"} format
          Object.assign(specsObj, item)
        }
      } else {
        specsObj[index] = item
      }
    })
    specs = specsObj
  }
  
  const extracted = {}
  
  // Fuel type
  if (!listing.fuel_type && specs.Fuel) {
    const fuelMap = {
      'Gasoline': 'Essence',
      'Diesel': 'Diesel',
      'Electric': 'Électrique',
      'Hybrid': 'Hybride',
      'Petrol': 'Essence',
      'Gas': 'Essence'
    }
    const fuelValue = String(specs.Fuel).trim()
    extracted.fuel_type = fuelMap[fuelValue] || fuelValue
  }
  
  // Transmission
  if (!listing.transmission && specs.Transmission) {
    const transMap = {
      'Manual': 'Manuelle',
      'Automatic': 'Automatique'
    }
    const transValue = String(specs.Transmission).trim()
    extracted.transmission = transMap[transValue] || transValue
  }
  
  // Power
  if (!listing.power_hp && specs.Power) {
    // Extract number from "85 kW" or "85 kW (116 PS)"
    const powerStr = String(specs.Power)
    const powerMatch = powerStr.match(/(\d+)\s*kW/i)
    if (powerMatch) {
      extracted.power_hp = Math.round(parseFloat(powerMatch[1]) * 1.36) // Convert kW to HP
    } else {
      // Try to extract HP directly
      const hpMatch = powerStr.match(/(\d+)\s*(?:ch|hp|PS)/i)
      if (hpMatch) {
        extracted.power_hp = parseInt(hpMatch[1])
      }
    }
  }
  
  // Doors
  if (!listing.doors && (specs['Door Count'] || specs.Doors)) {
    const doorCount = specs['Door Count'] || specs.Doors
    if (doorCount) {
      extracted.doors = parseInt(doorCount)
    }
  }
  
  // Mileage
  if ((!listing.mileage || listing.mileage === 0) && specs.Mileage) {
    // Extract number from "122,900 km" or "122900 km"
    const mileageStr = String(specs.Mileage).replace(/,/g, '')
    const mileageMatch = mileageStr.match(/(\d+)/)
    if (mileageMatch) {
      extracted.mileage = parseInt(mileageMatch[1])
    }
  }
  
  // Price - try to extract from description or other fields
  if ((!listing.price || listing.price === 0) && specs.Price) {
    const priceStr = String(specs.Price).replace(/[^\d]/g, '')
    if (priceStr) {
      extracted.price = parseInt(priceStr)
    }
  }
  
  return extracted
}

function renderListingContent(listing) {
  const listingContent = document.getElementById('listing-content')
  
  // Extract missing data from specifications
  const extracted = extractFromSpecifications(listing)
  
  // Merge extracted data with listing data (extracted takes precedence for missing values)
  const enrichedListing = {
    ...listing,
    fuel_type: listing.fuel_type || extracted.fuel_type,
    transmission: listing.transmission || extracted.transmission,
    power_hp: listing.power_hp || extracted.power_hp,
    doors: listing.doors || extracted.doors,
    mileage: (listing.mileage && listing.mileage > 0) ? listing.mileage : (extracted.mileage || 0),
    price: (listing.price && listing.price > 0) ? listing.price : (extracted.price || 0)
  }
  
  // Use market_price as fallback if price is 0
  const displayPrice = (enrichedListing.price && enrichedListing.price > 0) 
    ? enrichedListing.price 
    : (listing.market_price && listing.market_price > 0 ? listing.market_price : 0)
  const price = displayPrice > 0
    ? formatCurrency(displayPrice, listing.currency || 'EUR')
    : tr('Price on request', 'Prix sur demande')
  const marketPrice = listing.market_price ? formatCurrency(listing.market_price, listing.currency || 'EUR') : null
  const mileage = enrichedListing.mileage > 0 
    ? `${formatNumber(enrichedListing.mileage)} km`
    : null
  const postedDate = formatDate(listing.posted_date)
  const images = listing.images || []
  const mainImage = images[0] || 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(listing.brand + ' ' + listing.model)
  
  const sourceIcon = getSourceIcon(listing.source_platform || listing.source)
  const sourceName = getSourceName(listing.source_platform || listing.source)
  
  let html = `
    <div class="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      <!-- Left Column: Images -->
      <div class="lg:col-span-2">
        <!-- Main Image Carousel -->
        <div class="bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden mb-4 sm:mb-6">
          <div class="relative aspect-video bg-gray-200" id="main-image-container">
            <img id="main-image" src="${mainImage}" alt="${listing.brand} ${listing.model}" class="w-full h-full object-cover">
            ${images.length > 1 ? `
              <button id="carousel-prev" class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg transition">
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <button id="carousel-next" class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                <span id="image-counter">1</span> / ${images.length}
              </div>
            ` : ''}
          </div>
          
          <!-- Thumbnails -->
          ${images.length > 1 ? `
            <div class="p-2 sm:p-4 grid grid-cols-4 gap-1 sm:gap-2" id="thumbnail-grid">
              ${images.slice(0, 8).map((img, index) => `
                <img src="${img}" alt="" class="thumbnail-image w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-75 border-2 ${index === 0 ? 'border-blue-500' : 'border-transparent'} transition" data-index="${index}">
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <!-- Description -->
        ${listing.description ? `
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Description</h3>
            <div class="prose max-w-none text-gray-700" id="description-content">
              ${listing.description}
            </div>
          </div>
        ` : ''}
        
        <!-- Price History -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6" id="price-history-section">
          <h3 class="text-xl font-bold text-gray-900 mb-4">Évolution du prix</h3>
          <div id="price-history-content" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-4 text-gray-600 text-sm">Chargement de l'historique...</p>
          </div>
        </div>
        
        <!-- Specifications -->
        ${listing.specifications && Object.keys(listing.specifications).length > 0 ? `
          <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
            <h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Caractéristiques détaillées</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              ${Object.entries(listing.specifications)
                .filter(([key, value]) => value && typeof value === 'string' && value.trim() !== '')
                .slice(0, 30)
                .map(([key, value]) => `
                <div class="border-b border-gray-100 pb-2">
                  <div class="text-sm text-gray-600">${key}</div>
                  <div class="text-base font-medium text-gray-900">${value}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      
      <!-- Right Column: Details & Actions -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-24">
          <!-- Title & Price -->
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">${listing.year || ''} ${listing.brand || ''} ${listing.model || ''}</h1>
          <div class="text-3xl sm:text-4xl font-bold text-blue-600 mb-4 sm:mb-6">${price}</div>
          
          <!-- Market Price -->
          ${marketPrice ? `
            <div class="bg-blue-50 rounded-lg p-4 mb-6">
              <div class="flex items-center justify-between gap-3">
                <div class="flex-1">
                  <span class="text-sm text-gray-600">Prix marché estimé</span>
                  <div class="flex items-baseline gap-2 mt-1">
                    <span class="text-xl sm:text-2xl font-bold text-blue-600">${marketPrice}</span>
                    ${listing.confidence_index ? `
                      <span class="text-sm font-semibold ${(() => {
                        const confidence = listing.confidence_index
                        if (confidence >= 70) return 'text-green-600'
                        if (confidence >= 40) return 'text-yellow-600'
                        return 'text-red-600'
                      })()}">${listing.confidence_index}%</span>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- Key Specs -->
          ${(() => {
            const specs = []
            if (listing.year) {
              specs.push(`<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">Année</div><div class="text-lg font-semibold">${listing.year}</div></div>`)
            }
            if (mileage) {
              specs.push(`<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">Kilométrage</div><div class="text-lg font-semibold">${mileage}</div></div>`)
            }
            if (enrichedListing.fuel_type) {
              specs.push(`<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">Carburant</div><div class="text-lg font-semibold">${enrichedListing.fuel_type}</div></div>`)
            }
            if (enrichedListing.transmission) {
              specs.push(`<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">Boîte</div><div class="text-lg font-semibold">${enrichedListing.transmission}</div></div>`)
            }
            if (enrichedListing.doors) {
              specs.push(`<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">Portes</div><div class="text-lg font-semibold">${enrichedListing.doors} portes</div></div>`)
            }
            if (enrichedListing.power_hp) {
              specs.push(`<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">Puissance</div><div class="text-lg font-semibold">${enrichedListing.power_hp} ch</div></div>`)
            }
            if (specs.length === 0) return ''
            return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">${specs.join('')}</div>`
          })()}
          
          <!-- Location -->
          <div class="mb-6">
            <div class="flex items-center space-x-2 text-gray-700 mb-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span class="font-medium">${(() => {
                const city = listing.location_city || listing.location_region
                const country = listing.location_country || 'FR'
                return city ? (city + ', ' + country) : country
              })()}</span>
            </div>
            <div class="text-sm text-gray-500">Publié ${postedDate}</div>
          </div>
          
          <!-- Source Badge -->
          <div class="flex items-center space-x-2 mb-6 p-3 bg-gray-50 rounded-lg">
            <span class="text-xl">${sourceIcon}</span>
            <div>
              <div class="text-sm text-gray-600">Source</div>
              <div class="font-medium text-gray-900">${sourceName}</div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="space-y-3">
            <a href="${listing.url}" target="_blank" class="block w-full px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center text-sm sm:text-base">
              Voir l'annonce originale →
            </a>
            <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                <span>${tr('Favorite', 'Favoris')}</span>
              </button>
              <button class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                <span>${tr('Alert', 'Alerte')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  listingContent.innerHTML = html
  
  // Initialize image carousel if multiple images
  if (images.length > 1) {
    initializeImageCarousel(images)
  }
  
  // Load price history
  loadPriceHistory(listing.id)
  
  // Clean up description HTML if needed
  const descriptionContent = document.getElementById('description-content')
  if (descriptionContent) {
    // Remove script tags and other potentially dangerous content
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = descriptionContent.innerHTML
    const scripts = tempDiv.querySelectorAll('script')
    scripts.forEach(script => script.remove())
    descriptionContent.innerHTML = tempDiv.innerHTML
  }
}

async function loadPriceHistory(listingId) {
  const historyContent = document.getElementById('price-history-content')
  if (!historyContent) return
  
  try {
    const response = await fetch(`/api/v1/listings/${listingId}/price-history`)
    
    if (!response.ok) {
      throw new Error(tr('Failed to load price history', "Erreur lors du chargement de l'historique"))
    }
    
    const data = await response.json()
    const history = data.history || []
    
    if (history.length === 0) {
      historyContent.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <p>${tr('No price history available', 'Aucun historique de prix disponible')}</p>
        </div>
      `
      return
    }
    
    // Use Chart.js for better visualization
    historyContent.innerHTML = `
      <div class="relative" style="height: 300px;">
        <canvas id="price-history-chart"></canvas>
      </div>
      ${history.length >= 2 ? (() => {
        const firstPrice = parseFloat(history[0].price)
        const lastPrice = parseFloat(history[history.length - 1].price)
        const change = lastPrice - firstPrice
        const changePercent = ((change / firstPrice) * 100).toFixed(1)
        const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600'
        const changeIcon = change >= 0 ? '↑' : '↓'
        return `
          <div class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">${tr('Change since start', 'Évolution depuis le début')}</span>
              <span class="text-lg font-semibold ${changeColor}">
                ${changeIcon} ${formatCurrency(Math.abs(change), 'EUR')} (${Math.abs(changePercent)}%)
              </span>
            </div>
          </div>
        `
      })() : ''}
    `
    
    // Import and use chart helper
    const { createPriceHistoryChart } = await import('../utils/chartHelper.js')
    createPriceHistoryChart('price-history-chart', history)
  } catch (error) {
    console.error('Error loading price history:', error)
    historyContent.innerHTML = `
      <div class="text-center py-8 text-red-500">
        <p>${tr('Error loading history', "Erreur lors du chargement de l'historique")}</p>
      </div>
    `
  }
}

function initializeImageCarousel(images) {
  let currentIndex = 0
  const mainImage = document.getElementById('main-image')
  const counter = document.getElementById('image-counter')
  const prevBtn = document.getElementById('carousel-prev')
  const nextBtn = document.getElementById('carousel-next')
  const thumbnails = document.querySelectorAll('.thumbnail-image')
  
  const updateImage = (index) => {
    currentIndex = index
    if (mainImage) mainImage.src = images[index]
    if (counter) counter.textContent = (index + 1) + ' / ' + images.length
    
    // Update thumbnail selection
    thumbnails.forEach((thumb, i) => {
      if (i === index) {
        thumb.classList.add('border-blue-500')
        thumb.classList.remove('border-transparent')
      } else {
        thumb.classList.remove('border-blue-500')
        thumb.classList.add('border-transparent')
      }
    })
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      updateImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1)
    })
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      updateImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0)
    })
  }
  
  thumbnails.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const index = parseInt(thumb.dataset.index)
      updateImage(index)
    })
  })
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      updateImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1)
    } else if (e.key === 'ArrowRight') {
      updateImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0)
    }
  })
}

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
    'autoscout24': 'AutoScout24'
  }
  return names[source] || source
}

function formatDate(dateString) {
  if (!dateString) return 'Récemment'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return "Hier"
  if (days < 7) return "Il y a " + days + " jours"
  const locale = getLang() === 'fr' ? 'fr-FR' : 'en-US'
  return date.toLocaleDateString(locale)
}

