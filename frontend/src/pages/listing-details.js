import { tr, renderLanguageToggle, attachLanguageToggle, formatCurrency, formatNumber, getLang, capitalize } from '../utils/i18n.js'
import { getPlaceholderImageUrl, getFilteredImages } from '../utils/listingUtils.js'
import { isAuthenticated } from '../main.js'

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
  
  const searchLabel = tr('Search', 'Recherche')
  const backLabel = tr('Back', 'Retour')
  const loadingLabel = tr('Loading details...', 'Chargement des détails...')
  const errorLabel = tr('Loading error', 'Erreur de chargement')
  const backToSearchLabel = tr('Back to search', 'Retour à la recherche')
  const langToggle = renderLanguageToggle()
  
  document.body.innerHTML = '<div class="min-h-screen bg-gray-50">' +
    '<header class="bg-white shadow-sm sticky top-0 z-50">' +
    '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">' +
    '<div class="flex items-center justify-between h-14 sm:h-16">' +
    '<a href="/" class="flex items-center space-x-2"><span class="text-xl sm:text-2xl font-bold text-blue-600">Carindex</span></a>' +
    '<nav class="flex items-center space-x-2 sm:space-x-4">' +
    '<a href="/search" class="hidden sm:inline text-gray-700 hover:text-blue-600 transition text-sm sm:text-base">' + searchLabel + '</a>' +
    langToggle +
    '<a href="/search" class="px-3 sm:px-4 py-2 text-gray-700 hover:text-blue-600 transition text-sm sm:text-base inline-flex items-center">' +
    '<span class="hidden sm:inline">← ' + backLabel + '</span><span class="sm:hidden">←</span></a>' +
    '</nav></div></div></header>' +
    '<div id="loading-state" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">' +
    '<div class="text-center">' +
    '<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>' +
    '<p class="mt-4 text-gray-600">' + loadingLabel + '</p></div></div>' +
    '<div id="error-state" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">' +
    '<div class="text-center">' +
    '<svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
    '<h3 class="mt-4 text-lg font-medium text-gray-900">' + errorLabel + '</h3>' +
    '<p class="mt-2 text-sm text-gray-500" id="error-message"></p>' +
    '<div class="mt-6"><a href="/search" class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">' + backToSearchLabel + '</a></div>' +
    '</div></div>' +
    '<div id="listing-content" class="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"></div></div>'
  
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
      throw new Error(`Error ${response.status}: ${response.statusText}`)
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
    errorMessage.textContent = error.message || tr('An error occurred while loading the listing.', 'Une erreur est survenue lors du chargement de l\'annonce.')
  }
}

function buildSourceBadgeHtml(listing, sourceIcon, sourceName) {
  const sources = (listing.sources && listing.sources.length > 0)
    ? listing.sources
    : (listing.url ? [{ platform: listing.source_platform || listing.source, url: listing.url }] : [])
  if (sources.length === 1) {
    return '<div class="flex items-center space-x-2 mb-6 p-3 bg-gray-50 rounded-lg">' +
      '<span class="text-xl">' + sourceIcon + '</span>' +
      '<div><div class="text-sm text-gray-600">' + tr('Source', 'Source') + '</div>' +
      '<div class="font-medium text-gray-900">' + sourceName + '</div></div></div>'
  }
  if (sources.length > 1) {
    const badges = sources.map(s =>
      '<span class="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-sm">' +
      getSourceIcon(s.platform) + ' ' + getSourceName(s.platform) + '</span>'
    ).join('')
    return '<div class="mb-6"><div class="text-sm text-gray-600 mb-2">' +
      tr('Also available on', 'Disponible aussi sur') + '</div>' +
      '<div class="flex flex-wrap gap-2">' + badges + '</div></div>'
  }
  return ''
}

function buildSourceLinksHtml(listing) {
  const sources = (listing.sources && listing.sources.length > 0)
    ? listing.sources.filter(s => s.url)
    : (listing.url ? [{ platform: listing.source_platform || listing.source, url: listing.url }] : [])
  if (sources.length === 0) return ''
  const linkDisclaimer = '<p class="mt-2 text-xs text-gray-500">' + tr('The seller may have removed this listing. If the link shows an error, the car may no longer be available.', "Le vendeur peut avoir retiré cette annonce. Si le lien affiche une erreur, le véhicule n'est peut-être plus disponible.") + '</p>'
  if (sources.length === 1) {
    return '<a href="' + sources[0].url + '" target="_blank" rel="noopener noreferrer" class="block w-full px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center text-sm sm:text-base">' +
      tr('View original listing', "Voir l'annonce originale") + ' →</a>' + linkDisclaimer
  }
  const links = sources.map(s =>
    '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center text-sm">' +
    '<span>' + getSourceIcon(s.platform) + ' ' + getSourceName(s.platform) + '</span>' +
    '<span>→</span></a>'
  ).join('')
  return '<div class="space-y-2"><div class="text-sm font-medium text-gray-700">' +
    tr('Contact seller', 'Contacter le vendeur') + ' :</div>' + links + linkDisclaimer + '</div>'
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
  const images = getFilteredImages(listing.images)
  const mainImage = images[0] || getPlaceholderImageUrl(listing.brand, listing.model, 1200, 800)
  
  const sourceIcon = getSourceIcon(listing.source_platform || listing.source)
  const sourceName = getSourceName(listing.source_platform || listing.source)
  
  const favoriteAlertButtons = isAuthenticated()
    ? '<div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">' +
      '<button class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2">' +
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>' +
      '</svg><span>' + tr('Favorite', 'Favoris') + '</span></button>' +
      '<button class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2">' +
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>' +
      '</svg><span>' + tr('Alert', 'Alerte') + '</span></button></div>'
    : ''
  
  const locationCity = listing.location_city || listing.location_region
  const locationCountry = listing.location_country || 'FR'
  const locationDisplay = locationCity ? (locationCity + ', ' + locationCountry) : locationCountry
  
  const locationHtml = '<div class="mb-6">' +
    '<div class="flex items-center space-x-2 text-gray-700 mb-2">' +
    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>' +
    '</svg><span class="font-medium">' + locationDisplay + '</span></div>' +
    '<div class="text-sm text-gray-500">' + tr('Published', 'Publié') + ' ' + postedDate + '</div></div>'
  
  const actionsHtml = '<div class="space-y-3">' +
    buildSourceLinksHtml(listing) +
    favoriteAlertButtons +
    '</div>'
  
  // Build carousel HTML
  let carouselHtml = ''
  if (images.length > 1) {
    carouselHtml = '<button id="carousel-prev" class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg transition">' +
      '<svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>' +
      '<button id="carousel-next" class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg transition">' +
      '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>' +
      '<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">' +
      '<span id="image-counter">1</span> / ' + images.length + '</div>'
  }
  
  // Build thumbnails HTML
  let thumbnailsHtml = ''
  if (images.length > 1) {
    thumbnailsHtml = '<div class="p-2 sm:p-4 grid grid-cols-4 gap-1 sm:gap-2" id="thumbnail-grid">' +
      images.slice(0, 8).map(function (img, index) {
        const borderCls = index === 0 ? 'border-blue-500' : 'border-transparent'
        return '<img src="' + img + '" alt="" class="thumbnail-image w-full aspect-square object-cover object-center rounded-lg cursor-pointer hover:opacity-90 border-2 ' + borderCls + ' transition" data-index="' + index + '" referrerpolicy="no-referrer">'
      }).join('') + '</div>'
  }
  
  // Build description HTML
  let descriptionHtml = ''
  if (listing.description) {
    descriptionHtml = '<div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">' +
      '<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">' + tr('Description', 'Description') + '</h3>' +
      '<div class="prose max-w-none text-gray-700" id="description-content">' + listing.description + '</div></div>'
  }
  
  // Build specifications HTML
  let specsSectionHtml = ''
  if (listing.specifications && Object.keys(listing.specifications).length > 0) {
    const specEntries = Object.entries(listing.specifications)
      .filter(function (kv) { return kv[1] && typeof kv[1] === 'string' && kv[1].trim() !== '' })
      .slice(0, 30)
    specsSectionHtml = '<div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">' +
      '<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">' + tr('Detailed specifications', 'Caractéristiques détaillées') + '</h3>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">' +
      specEntries.map(function (kv) {
        return '<div class="border-b border-gray-100 pb-2"><div class="text-sm text-gray-600">' + kv[0] + '</div><div class="text-base font-medium text-gray-900">' + kv[1] + '</div></div>'
      }).join('') + '</div></div>'
  }
  
  // Build market price HTML
  let marketPriceHtml = ''
  if (marketPrice) {
    let confClass = 'text-red-600'
    if (listing.confidence_index >= 70) confClass = 'text-green-600'
    else if (listing.confidence_index >= 40) confClass = 'text-yellow-600'
    const confSpan = listing.confidence_index
      ? '<span class="text-sm font-semibold ' + confClass + '">' + listing.confidence_index + '%</span>'
      : ''
    marketPriceHtml = '<div class="bg-blue-50 rounded-lg p-4 mb-6">' +
      '<div class="flex items-center justify-between gap-3"><div class="flex-1">' +
      '<span class="text-sm text-gray-600">' + tr('Estimated market price', 'Prix marché estimé') + '</span>' +
      '<div class="flex items-baseline gap-2 mt-1">' +
      '<span class="text-xl sm:text-2xl font-bold text-blue-600">' + marketPrice + '</span>' + confSpan +
      '</div></div></div></div>'
  }
  
  // Build key specs HTML
  const specs = []
  if (listing.year) specs.push('<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">' + tr('Year', 'Année') + '</div><div class="text-lg font-semibold">' + listing.year + '</div></div>')
  if (mileage) specs.push('<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">' + tr('Mileage', 'Kilométrage') + '</div><div class="text-lg font-semibold">' + mileage + '</div></div>')
  if (enrichedListing.fuel_type) {
    const fuelMap = { petrol: tr('PETROL', 'ESSENCE'), gasolina: tr('PETROL', 'ESSENCE'), diesel: tr('DIESEL', 'DIESEL'), diésel: tr('DIESEL', 'DIESEL'), hybrid: tr('HYBRID', 'HYBRIDE'), electric: tr('ELECTRIC', 'ÉLECTRIQUE'), electro: tr('ELECTRIC', 'ÉLECTRIQUE'), 'electro/gasolina': tr('ELECTRIC/PETROL', 'ÉLECTRIQUE/ESSENCE'), 'electro/gasoline': tr('ELECTRIC/PETROL', 'ÉLECTRIQUE/ESSENCE') }
    const rawFuel = enrichedListing.fuel_type.toLowerCase().trim()
    const fuelDisplay = rawFuel ? (fuelMap[rawFuel] || rawFuel.split(/[/\s]+/).map(function (p) { return fuelMap[p.trim()] || p }).join('/')) : enrichedListing.fuel_type
    specs.push('<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">' + tr('Fuel', 'Carburant') + '</div><div class="text-lg font-semibold">' + fuelDisplay + '</div></div>')
  }
  if (enrichedListing.transmission) {
    const transMap = { automatic: tr('AUTOMATIC', 'AUTOMATIQUE'), manual: tr('MANUAL', 'MANUELLE') }
    const transDisplay = transMap[enrichedListing.transmission.toLowerCase()] || enrichedListing.transmission
    specs.push('<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">' + tr('Transmission', 'Boîte') + '</div><div class="text-lg font-semibold">' + transDisplay + '</div></div>')
  }
  if (enrichedListing.doors) specs.push('<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">' + tr('Doors', 'Portes') + '</div><div class="text-lg font-semibold">' + enrichedListing.doors + ' ' + tr('doors', 'portes') + '</div></div>')
  if (enrichedListing.power_hp) specs.push('<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-600 mb-1">' + tr('Power', 'Puissance') + '</div><div class="text-lg font-semibold">' + enrichedListing.power_hp + ' ' + tr('hp', 'ch') + '</div></div>')
  const keySpecsHtml = specs.length > 0 ? '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">' + specs.join('') + '</div>' : ''
  
  const priceEvolutionLabel = tr('Price evolution', 'Évolution du prix')
  const loadingHistoryLabel = tr('Loading history...', "Chargement de l'historique...")
  const title = (listing.year || '') + ' ' + capitalize(listing.brand) + ' ' + capitalize(listing.model)
  
  const html = '<div class="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">' +
    '<div class="lg:col-span-2">' +
    '<div class="bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden mb-4 sm:mb-6">' +
    '<div class="relative aspect-video bg-gray-100 overflow-hidden" id="main-image-container">' +
    '<img id="main-image" src="' + mainImage + '" alt="' + listing.brand + ' ' + listing.model + '" class="absolute inset-0 w-full h-full object-cover object-center block" referrerpolicy="no-referrer">' +
    carouselHtml +
    '</div>' + thumbnailsHtml + '</div>' +
    descriptionHtml +
    '<div class="bg-white rounded-xl shadow-lg p-6 mb-6" id="price-history-section">' +
    '<h3 class="text-xl font-bold text-gray-900 mb-4">' + priceEvolutionLabel + '</h3>' +
    '<div id="price-history-content" class="text-center py-8">' +
    '<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>' +
    '<p class="mt-4 text-gray-600 text-sm">' + loadingHistoryLabel + '</p></div></div>' +
    specsSectionHtml +
    '</div>' +
    '<div class="lg:col-span-1">' +
    '<div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-24">' +
    '<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">' + title + '</h1>' +
    '<div class="text-3xl sm:text-4xl font-bold text-blue-600 mb-4 sm:mb-6">' + price + '</div>' +
    marketPriceHtml +
    keySpecsHtml +
    locationHtml +
    buildSourceBadgeHtml(listing, sourceIcon, sourceName) +
    actionsHtml +
    '</div></div></div>'
  
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
      historyContent.innerHTML = '<div class="text-center py-8 text-gray-500">' +
        '<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>' +
        '</svg><p>' + tr('No price history available', 'Aucun historique de prix disponible') + '</p></div>'
      return
    }
    
    // Use Chart.js for better visualization
    let changeHtml = ''
    if (history.length >= 2) {
      const firstPrice = parseFloat(history[0].price)
      const lastPrice = parseFloat(history[history.length - 1].price)
      const change = lastPrice - firstPrice
      const changePercent = ((change / firstPrice) * 100).toFixed(1)
      const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600'
      const changeIcon = change >= 0 ? '↑' : '↓'
      changeHtml = '<div class="mt-4 pt-4 border-t border-gray-200">' +
        '<div class="flex items-center justify-between">' +
        '<span class="text-sm text-gray-600">' + tr('Change since start', 'Évolution depuis le début') + '</span>' +
        '<span class="text-lg font-semibold ' + changeColor + '">' +
        changeIcon + ' ' + formatCurrency(Math.abs(change), 'EUR') + ' (' + Math.abs(changePercent) + '%)</span></div></div>'
    }
    historyContent.innerHTML = '<div class="relative" style="height: 300px;">' +
      '<canvas id="price-history-chart"></canvas></div>' + changeHtml
    
    // Import and use chart helper
    const { createPriceHistoryChart } = await import('../utils/chartHelper.js')
    createPriceHistoryChart('price-history-chart', history)
  } catch (error) {
    console.error('Error loading price history:', error)
    historyContent.innerHTML = '<div class="text-center py-8 text-red-500">' +
      '<p>' + tr('Error loading history', "Erreur lors du chargement de l'historique") + '</p></div>'
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
    'autoscout24': '🟠',
    'gaspedaal': '🔴',
    'marktplaats': '🟠',
    bilweb: '🟡',
    bytbil: '🟣',
    blocket: '🔵'
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
    bilweb: 'Bilweb.se',
    bytbil: 'Bytbil.com',
    blocket: 'Blocket.se',
    'coches.net': 'Coches.net',
    finn: 'FINN.no',
    otomoto: 'OtoMoto.pl',
    '2ememain': '2emain.be',
    deuxememain: '2emain.be',
    largus: "L'Argus",
    lacentrale: 'La Centrale',
    subito: 'Subito.it'
  }
  return names[source] || (source ? String(source).replace(/\./g, '') : '')
}

function formatDate(dateString) {
  if (!dateString) return tr('Recently', 'Récemment')
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return tr("Today", "Aujourd'hui")
  if (days === 1) return tr("Yesterday", "Hier")
  if (days < 7) return getLang() === 'fr' ? "Il y a " + days + " jours" : days + " days ago"
  const locale = getLang() === 'fr' ? 'fr-FR' : 'en-US'
  return date.toLocaleDateString(locale)
}

