import { logger } from '../utils/logger.js';
import { supabase } from '../config/supabase.js';
import { launchBrowser } from '../utils/puppeteerLaunch.js';

// In-memory cache with TTL (24 hours)
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Function to clear cache (useful when URL format changes)
export function clearComparablesCache() {
  cache.clear();
  logger.info('Comparables cache cleared');
}

/**
 * Calculate similarity between two strings (0-1, where 1 is identical)
 * Simple implementation using longest common subsequence
 */
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  // If one string contains the other, high similarity
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // Simple character overlap
  let matches = 0;
  const shorterChars = shorter.split('');
  for (const char of shorterChars) {
    if (longer.includes(char)) {
      matches++;
    }
  }
  
  return matches / Math.max(str1.length, str2.length);
}

/**
 * Generate cache key from search parameters
 */
function generateCacheKey(auctionListing, targetDepartments) {
  const brand = (auctionListing.brand || '').toLowerCase();
  const model = (auctionListing.model || '').toLowerCase();
  const year = auctionListing.year || 0;
  const fuel = (auctionListing.fuel_type || '').toLowerCase();
  const transmission = (auctionListing.transmission || '').toLowerCase();
  const depts = (targetDepartments || []).sort().join(',');
  
  return `${brand}:${model}:${year}:${fuel}:${transmission}:${depts}`;
}

/**
 * Build Leboncoin search URL with query parameters
 * 
 * Leboncoin supports multiple URL formats:
 * 1. Search URL: https://www.leboncoin.fr/recherche?category=2&u_car_brand=BMW&text=model
 * 2. Category URL: https://www.leboncoin.fr/c/voitures
 * 
 * Leboncoin search works better with:
 * - u_car_brand for brand filtering
 * - text for model search
 * - price=min-max format
 * 
 * Category 2 = Voitures (Cars)
 * Fuel: 1=Essence, 2=Diesel, 3=Électrique, 4=Hybride, 5=GPL
 * Gearbox: 1=Manuelle, 2=Automatique
 */
export function buildSearchQuery(auctionListing, targetDepartments = [13, 83, 84]) {
  const baseUrl = 'https://www.leboncoin.fr/recherche';
  const params = new URLSearchParams();
  
  // Category: 2 = Voitures
  params.set('category', '2');
  
  // Brand and model - include trim if available
  const brand = (auctionListing.brand || '').trim();
  const model = (auctionListing.model || '').trim();
  const trim = (auctionListing.trim || '').trim();
  const fuelType = (auctionListing.fuel_type || '').toLowerCase();
  
  // IMPORTANT: Use structured filters (u_car_brand) instead of text search for better CheerioCrawler compatibility
  // CheerioCrawler works better with structured filters like u_car_brand=BMW than text=BMW
  // This matches the working URL format: https://www.leboncoin.fr/recherche?category=2&u_car_brand=BMW&price=26000-29600
  
  // Map brand names to Leboncoin brand codes (use uppercase brand name as code)
  // Leboncoin uses uppercase brand names as filter values (e.g., u_car_brand=BMW, u_car_brand=MERCEDES)
  if (brand) {
    // Use uppercase brand name as filter value
    const brandCode = brand.toUpperCase();
    params.set('u_car_brand', brandCode);
    logger.debug('Using structured brand filter', { brand, brandCode });
  }
  
  // For model, use text search (model names are too varied for structured filters)
  if (model) {
    let searchText = model;
    
    // Add trim/finition if available, but only if it's not a VIN-like code
    if (trim) {
      const isVinLike = /^[A-Z0-9]{8,}$/.test(trim.trim());
      if (!isVinLike) {
        searchText += ` ${trim}`;
      } else {
        logger.debug('Skipping VIN-like trim in search', { trim, brand, model });
      }
    }
    
    // For electric vehicles, add "e-tron" if not already in model name
    if (fuelType === 'electric' || fuelType === 'électrique') {
      const modelLower = model.toLowerCase();
      if (!modelLower.includes('e-tron') && !modelLower.includes('etron') && !modelLower.includes(' e ')) {
        searchText += ' e-tron';
      }
    }
    
    params.set('text', searchText);
    params.set('search_in', 'subject');
  }
  
  // Regions - Use Leboncoin region codes (r_XX format) instead of slugs
  // r_21 = Provence-Alpes-Côte d'Azur (PACA)
  // r_11 = Occitanie
  if (Array.isArray(targetDepartments) && targetDepartments.length > 0) {
    // Group departments by region
    const pacaDepartments = [13, 83, 6, 84];
    const occitanieDepartments = [34, 30];
    
    const hasPaca = targetDepartments.some(dept => {
      const deptNum = parseInt(dept);
      return pacaDepartments.includes(deptNum);
    });
    const hasOccitanie = targetDepartments.some(dept => {
      const deptNum = parseInt(dept);
      return occitanieDepartments.includes(deptNum);
    });
    
    // Use locations parameter with region codes (r_XX format) instead of regions (slug format)
    const regionCodes = [];
    if (hasPaca) {
      regionCodes.push('r_21'); // PACA
    }
    if (hasOccitanie) {
      regionCodes.push('r_11'); // Occitanie
    }
    
    if (regionCodes.length > 0) {
      // Use locations parameter (r_XX format) - this is the correct format for Leboncoin
      params.set('locations', regionCodes.join(','));
      logger.debug('Using Leboncoin region codes', {
        targetDepartments,
        regionCodes,
        hasPaca,
        hasOccitanie
      });
    } else {
      // Fallback: if departments don't match known regions, use department codes
      const deptCodes = targetDepartments.map(dept => {
        const deptNum = parseInt(dept);
        return deptNum.toString().padStart(2, '0');
      });
      params.set('locations', deptCodes.join(','));
      logger.warn('Unknown departments, using department codes as fallback', {
        targetDepartments,
        deptCodes
      });
    }
  }
  
  // Year range: Don't set initially - too restrictive and reduces results
  // The text search (brand + model) should be enough to find relevant vehicles
  // We'll filter by year after fetching results if needed
  const year = auctionListing.year || 0;
  // if (year > 0) {
  //   const yearMin = Math.max(1990, year - 2); // Allow 2 years older
  //   const yearMax = Math.min(new Date().getFullYear() + 1, year + 3); // Allow 3 years newer
  //   params.set('year_min', yearMin.toString());
  //   params.set('year_max', yearMax.toString());
  // }
  if (year > 0) {
    logger.debug('Skipping year filter to get more results', { year });
  }
  
  // Mileage range: Don't set initially - too restrictive and reduces results
  // We'll filter by mileage after fetching results if needed
  const mileage = auctionListing.mileage || 0;
  // if (mileage > 0) {
  //   const mileageMin = Math.max(0, Math.floor(mileage * 0.5)); // Allow 50% less
  //   const mileageMax = Math.floor(mileage * 1.5); // Allow 50% more
  //   params.set('mileage_min', mileageMin.toString());
  //   params.set('mileage_max', mileageMax.toString());
  // }
  if (mileage > 0) {
    logger.debug('Skipping mileage filter to get more results', { mileage });
  }
  
  // Fuel type mapping for Leboncoin
  // Leboncoin fuel codes: 1=Essence, 2=Diesel, 3=Électrique, 4=Hybride, 5=GPL
  // IMPORTANT: Do NOT set fuel filter if electric - let Leboncoin handle it via text search
  // The fuel=3 parameter seems to be misinterpreted by Leboncoin as GPL
  // Note: fuelType is already declared above (line 49)
  
  // For electric vehicles, don't use fuel filter - rely on text search instead
  // This avoids the GPL misinterpretation issue
  if (fuelType === 'electric' || fuelType === 'électrique') {
    // Don't set fuel parameter for electric - let text search handle it
    logger.debug('Skipping fuel filter for electric vehicle to avoid GPL misinterpretation');
  } else {
    const fuelMap = {
      'petrol': '1',
      'essence': '1',
      'diesel': '2',
      'hybrid': '4',
      'hybride': '4',
      'gpl': '5',
      'lpg': '5'
    };
    
    if (fuelMap[fuelType]) {
      // Don't set fuel filter initially - it's too restrictive and reduces results
      // The text search should be enough to find relevant vehicles
      // params.set('fuel', fuelMap[fuelType]);
      logger.debug('Skipping fuel filter to get more results', { fuelType, fuelCode: fuelMap[fuelType] });
    }
  }
  
  // Transmission mapping - make it optional to get more results
  const transmission = (auctionListing.transmission || '').toLowerCase();
  // Don't set transmission filter initially - it's too restrictive
  // if (transmission === 'manual' || transmission === 'manuelle') {
  //   params.set('gearbox', '1');
  // } else if (transmission === 'automatic' || transmission === 'automatique') {
  //   params.set('gearbox', '2');
  // }
  if (transmission) {
    logger.debug('Skipping transmission filter to get more results', { transmission });
  }
  
  // Sort by date (newest first)
  params.set('sort', 'time');
  params.set('order', 'desc');
  
  const url = `${baseUrl}?${params.toString()}`;
  
  logger.info('Built Leboncoin search URL', {
    url,
    hasUCarBrand: params.has('u_car_brand'),
    uCarBrand: params.get('u_car_brand'),
    text: params.get('text'),
    auctionListing: {
      brand,
      model,
      year,
      mileage,
      fuel_type: fuelType,
      transmission
    }
  });
  
  return url;
}

/**
 * Parse Leboncoin listing data into ComparableListing format
 */
export function parseListing(listingData) {
  // Extract listing ID from URL
  const urlMatch = listingData.url?.match(/\/(\d+)(?:\?|$)/);
  const sourceListingId = urlMatch ? urlMatch[1] : (listingData.id?.toString() || listingData.url);
  
  // Parse price - Puppeteer format
  let priceValue = 0;
  if (listingData.price) {
    if (typeof listingData.price === 'object') {
      priceValue = listingData.price.amount || listingData.price.value || listingData.price.price || 0;
    } else if (typeof listingData.price === 'string') {
      // Clean price string: remove currency symbols, spaces, keep only digits
      priceValue = listingData.price.replace(/[€$£¥,\s]/g, '').replace(',', '.').replace(/[^\d.]/g, '');
    } else {
      priceValue = listingData.price;
    }
  }
  // Also check price_eur (Puppeteer format)
  if (priceValue === 0 && listingData.price_eur) {
    priceValue = typeof listingData.price_eur === 'number' ? listingData.price_eur : parseFloat(listingData.price_eur) || 0;
  }
  const priceEur = parseFloat(priceValue) || 0;
  
  // Sanity check: reject prices that are clearly wrong
  // For used cars, prices above 200k EUR are extremely rare and likely errors
  // Also check for suspiciously high prices relative to typical vehicle values
  if (priceEur > 200000) {
    logger.warn('Price seems incorrect (too high), rejecting', { 
      priceEur, 
      url: listingData.url,
      year: listingData.year || listingData.attributes?.['First Registration']
    });
    return null; // Return null to filter out this listing
  }
  
  // Additional check: if price is between 100k and 200k, verify it's reasonable
  // Most used cars (even luxury) should be under 150k unless very new/exotic
  if (priceEur > 100000 && priceEur <= 200000) {
    const year = listingData.year || listingData.attributes?.['First Registration'];
    if (year) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - (typeof year === 'string' ? parseInt(year.match(/\d{4}/)?.[0] || currentYear) : year);
      // If car is more than 5 years old and price > 100k, it's suspicious
      if (age > 5) {
        logger.warn('Price seems suspiciously high for vehicle age, rejecting', {
          priceEur,
          year,
          age,
          url: listingData.url
        });
        return null;
      }
    }
  }
  
  // Extract attributes
  const attrs = listingData.attributes || {};
  
  // Mileage - Puppeteer format
  let mileageValue = attrs['Mileage (km)'] || attrs.mileage || listingData.mileage || listingData.mileage_km || listingData.kilometers || listingData.km || 0;
  if (typeof mileageValue === 'string') {
    mileageValue = mileageValue.replace(/[^\d]/g, '');
  }
  const mileageKm = parseInt(mileageValue) || 0;
  
  // Year
  let yearValue = attrs['First Registration'] || attrs.firstRegistration || listingData.year || null;
  let year = null;
  if (yearValue) {
    if (typeof yearValue === 'string') {
      const yearMatch = yearValue.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[0]);
      } else {
        year = parseInt(yearValue);
      }
    } else {
      year = parseInt(yearValue);
    }
  }
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) {
    // Year is invalid, set to null
    year = null;
  }
  
  // If year is still null, don't use a default - filter out listings without year
  // This ensures we only use comparables with valid years
  
  // Fuel type
  const fuelTypeRaw = attrs.Fuel || attrs.fuel || listingData.fuel || null;
  const fuelTypeMap = {
    'essence': 'petrol',
    'diesel': 'diesel',
    'électrique': 'electric',
    'electric': 'electric',
    'hybride': 'hybrid',
    'hybrid': 'hybrid',
    'gpl': 'gpl',
    'lpg': 'gpl'
  };
  const fuelType = fuelTypeRaw ? (fuelTypeMap[fuelTypeRaw.toLowerCase()] || fuelTypeRaw.toLowerCase()) : null;
  
  // Transmission
  const transmissionRaw = attrs.Transmission || attrs.transmission || listingData.transmission || null;
  const transmissionMap = {
    'manuelle': 'manual',
    'manual': 'manual',
    'automatique': 'automatic',
    'automatic': 'automatic'
  };
  const transmission = transmissionRaw ? (transmissionMap[transmissionRaw.toLowerCase()] || transmissionRaw.toLowerCase()) : null;
  
  // Power
  let powerHp = null;
  const powerHpValue = attrs['Power (HP)'] || attrs.power || listingData.power || null;
  const powerKwValue = attrs['Power (kW)'] || null;
  if (powerHpValue) {
    powerHp = parseInt(powerHpValue) || null;
  } else if (powerKwValue) {
    powerHp = Math.round(parseFloat(powerKwValue) * 1.36);
  }
  
  // Trim
  const trimText = listingData.modelVersion || attrs.trim || attrs.version || listingData.trim || null;
  
  // Location - extract department from address
  // 3x1t actor returns: location.addressStructured.department (e.g., "Vosges", "Bouches-du-Rhône")
  // Puppeteer returns: location_department directly or location string with postal code
  let locationDepartment = listingData.location_department || null;
  
  if (!locationDepartment) {
    const location = listingData.location || {};
    const addressStructured = location.addressStructured || {};
    
    // Try to get department code directly from structured address
    if (addressStructured.department) {
      const deptName = addressStructured.department;
      // Map common department names to codes (for South of France: 13, 83, 06, 84, 34, 30)
      const deptNameToCode = {
        'bouches-du-rhône': '13', 'bouches du rhone': '13', 'bdr': '13',
        'var': '83',
        'alpes-maritimes': '06', 'alpes maritimes': '06',
        'vaucluse': '84',
        'hérault': '34',
        'gard': '30'
      };
      const deptLower = deptName.toLowerCase().trim();
      if (deptNameToCode[deptLower]) {
        locationDepartment = deptNameToCode[deptLower];
      }
    }
    
    // Try to extract from postal code if available
    if (!locationDepartment) {
      const postalCode = addressStructured.postalCode || addressStructured.zip || location.postalCode || null;
      if (postalCode) {
        const deptMatch = postalCode.toString().match(/^(\d{2})/);
        if (deptMatch) {
          locationDepartment = deptMatch[1];
        }
      }
    }
    
    // Fallback: try to extract from location string (Puppeteer format)
    if (!locationDepartment && listingData.location) {
      const locationStr = typeof listingData.location === 'string' ? listingData.location : '';
      const deptMatch = locationStr.match(/\b(\d{2})\d{3}\b/); // Match postal code pattern
      if (deptMatch) {
        locationDepartment = deptMatch[1];
      }
    }
  }
  
  // Seller type
  const dealerDetails = listingData.dealerDetails || {};
  const sellerType = dealerDetails.sellerType === 'Dealer' || dealerDetails.sellerType === 'Professional'
    ? 'pro'
    : 'part';
  
  // Title
  const title = listingData.title || listingData.name || `${listingData.brand || ''} ${listingData.model || ''}`.trim() || 'Vehicle';
  
  // Return null if critical data is missing or invalid
  if (!title || priceEur <= 0 || !year) {
    logger.warn('Listing missing critical data, filtering out', {
      hasTitle: !!title,
      priceEur,
      year,
      url: listingData.url
    });
    return null;
  }
  
  return {
    source: 'leboncoin',
    url: listingData.url,
    title,
    price_eur: priceEur,
    year: year, // Use actual year, no default
    mileage_km: mileageKm,
    fuel_type: fuelType,
    transmission,
    power_hp: powerHp,
    trim_text: trimText,
    location_department: locationDepartment,
    seller_type: sellerType,
    raw_json: listingData
  };
}

/**
 * Fetch results from Leboncoin using Puppeteer (direct scraping with browser)
 * Returns array of parsed listings
 */
async function fetchResultsWithPuppeteer(searchUrl, maxResults = 100) {
  let browser = null;
  try {
    logger.info('Fetching Leboncoin comparables using Puppeteer', {
      searchUrl,
      maxResults
    });
    
    browser = await launchBrowser();
    
    const page = await browser.newPage();
    
    // Set realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent and additional headers to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Navigate to search URL
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for results to load (Leboncoin loads them via JavaScript)
    // Try multiple selectors with increasing wait times
    let foundResults = false;
    const selectorsToTry = [
      '[data-test-id="ad"]',
      'a[data-qa-id="aditem_container"]',
      'a[href*="/ad/"]',
      '[data-qa-id="aditem_container"]',
      '.aditem',
      'article[data-qa-id="aditem_container"]'
    ];
    
    for (const selector of selectorsToTry) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        foundResults = true;
        logger.info('Found results container', { selector, searchUrl });
        break;
      } catch (e) {
        // Try next selector
        continue;
      }
    }
    
    // If no selector worked, wait a bit more for content to load (reduced from 5s to 2s)
    if (!foundResults) {
      logger.warn('Could not find results container with any selector, waiting for content to load', { searchUrl });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced from 5 seconds to 2 seconds
    }
    
    // Scroll down to trigger lazy loading of more results (reduced wait times)
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 2s to 1s
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 2s to 1s
    } catch (scrollError) {
      logger.warn('Error scrolling page', { error: scrollError.message });
    }
    
    // Extract listings from the page
    const listings = await page.evaluate((maxItems) => {
      const results = [];
      
      // Try multiple selectors for Leboncoin listings
      // Updated selectors based on current Leboncoin structure
      const selectors = [
        '[data-test-id="ad"]',
        'a[data-qa-id="aditem_container"]',
        '[data-qa-id="aditem_container"]',
        'article[data-qa-id="aditem_container"]',
        'a[href*="/ad/"]',
        '.aditem',
        '[class*="aditem"]',
        'a[href^="/ad/"]',
        'a[href*="leboncoin.fr/ad/"]',
        '[class*="AdItem"]',
        'div[class*="aditem"]',
        // Additional modern selectors
        '[data-qa-id="aditem"]',
        'a[href*="/voitures/"]',
        'a[href*="/motos/"]',
        '[class*="AdCard"]',
        '[class*="AdCardContainer"]',
        'div[class*="styles_aditem"]',
        'article[class*="aditem"]'
      ];
      
      let elements = [];
      let usedSelector = '';
      for (const selector of selectors) {
        elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          console.log('Found', elements.length, 'elements with selector:', selector);
          usedSelector = selector;
          break;
        }
      }
      
      console.log('Total elements found:', elements.length, 'with selector:', usedSelector);
      
      // If we found a container but no individual items, try to find items inside the container
      if (elements.length === 1 && usedSelector === '[data-test-id="ad"]') {
        // This is likely the container, find items inside it
        const container = elements[0];
        const itemSelectors = [
          'a[href*="/ad/"]',
          'a[href*="/voitures/"]',
          'a[href*="/motos/"]',
          'article',
          'div[class*="item"]',
          'div[class*="card"]',
          '[data-qa-id*="item"]',
          '[data-qa-id*="card"]'
        ];
        for (const itemSelector of itemSelectors) {
          const items = Array.from(container.querySelectorAll(itemSelector));
          if (items.length > 0) {
            console.log('Found', items.length, 'items inside container with selector:', itemSelector);
            elements = items;
            usedSelector = `${usedSelector} > ${itemSelector}`;
            break;
          }
        }
      }
      
      // If still no elements, try to find ALL ad links on the page (not just in container)
      // This is a fallback when the container structure doesn't match
      if (elements.length === 0) {
        console.log('No elements found with selectors, trying to find all ad links on page');
        const allAdLinks = Array.from(document.querySelectorAll('a[href*="/ad/"]'));
        const allVehicleLinks = Array.from(document.querySelectorAll('a[href*="/voitures/"], a[href*="/motos/"]'));
        const combinedLinks = [...allAdLinks, ...allVehicleLinks];
        
        // Remove duplicates and filter out navigation links
        const uniqueLinks = [];
        const seenHrefs = new Set();
        for (const link of combinedLinks) {
          const href = link.href || link.getAttribute('href') || '';
          if (href && !seenHrefs.has(href)) {
            // Filter out navigation/filter links
            if (!href.includes('/c/voitures/u_car_brand:') && 
                !href.includes('/c/motos/u_car_brand:') &&
                !href.includes('/recherche?') &&
                (href.match(/\/ad\/[a-z0-9-]+/i) || 
                 href.match(/\/voitures\/[a-z0-9-]+$/i) || 
                 href.match(/\/motos\/[a-z0-9-]+$/i))) {
              seenHrefs.add(href);
              uniqueLinks.push(link);
            }
          }
        }
        
        if (uniqueLinks.length > 0) {
          console.log('Found', uniqueLinks.length, 'unique ad links on page (fallback method)');
          elements = uniqueLinks;
          usedSelector = 'a[href*="/ad/"], a[href*="/voitures/"], a[href*="/motos/"] (fallback)';
        }
      }
      
      // If no elements found with specific selectors, try to find links directly
      // This is important because Leboncoin may have changed their structure
      if (elements.length === 0) {
        // Try to find any links to /ad/ or /voitures/ or /motos/
        const allAdLinks = Array.from(document.querySelectorAll('a[href*="/ad/"]'));
        const allVehicleLinks = Array.from(document.querySelectorAll('a[href*="/voitures/"], a[href*="/motos/"]'));
        console.log('Found', allAdLinks.length, 'links containing /ad/');
        console.log('Found', allVehicleLinks.length, 'vehicle links');
        
        // Combine both types of links
        const combinedLinks = [...allAdLinks, ...allVehicleLinks];
        
        // Remove duplicates by href
        const uniqueLinks = [];
        const seenHrefs = new Set();
        for (const link of combinedLinks) {
          const href = link.href || link.getAttribute('href') || '';
          if (href && !seenHrefs.has(href)) {
            seenHrefs.add(href);
            uniqueLinks.push(link);
          }
        }
        
        console.log('Found', uniqueLinks.length, 'unique Leboncoin ad links');
        elements = uniqueLinks;
      }
      
      // If still no elements, try even more generic approach
      if (elements.length === 0) {
        // Try any link that might be an ad
        const genericLinks = Array.from(document.querySelectorAll('a')).filter(a => {
          const href = a.href || a.getAttribute('href') || '';
          return href.includes('leboncoin.fr') && (href.includes('/ad/') || href.includes('/voitures/') || href.includes('/motos/'));
        });
        console.log('Found', genericLinks.length, 'generic Leboncoin links');
        elements = genericLinks;
      }
      
      // Debug: log page structure
      if (elements.length === 0) {
        const debugInfo = {
          bodyText: document.body?.textContent?.substring(0, 500),
          allLinks: document.querySelectorAll('a').length,
          allDivs: document.querySelectorAll('div').length,
          pageTitle: document.title,
          url: window.location.href,
          // Check for common Leboncoin patterns
          hasSearchResults: document.body?.textContent?.includes('annonce') || document.body?.textContent?.includes('résultat'),
          hasNoResults: document.body?.textContent?.includes('Aucun résultat') || document.body?.textContent?.includes('aucun résultat')
        };
        console.log('Page structure debug:', debugInfo);
        // Return debug info so it can be logged server-side
        return { debug: debugInfo, listings: [] };
      }
      
      elements.slice(0, maxItems).forEach((element, index) => {
        try {
          // Extract URL - try multiple ways
          let url = '';
          
          // If element is already a link, get href directly
          if (element.tagName === 'A' || element.tagName === 'a') {
            url = element.href || element.getAttribute('href') || '';
            // Make URL absolute if relative
            if (url && url.startsWith('/')) {
              url = 'https://www.leboncoin.fr' + url;
            }
          } else {
            // Try to find a link inside the element
            const linkEl = element.querySelector('a[href*="/ad/"]') || 
                          element.querySelector('a[href*="/voitures/"]') ||
                          element.querySelector('a[href*="/motos/"]') ||
                          element.querySelector('a');
            url = linkEl?.href || linkEl?.getAttribute('href') || '';
            // Make URL absolute if relative
            if (url && url.startsWith('/')) {
              url = 'https://www.leboncoin.fr' + url;
            }
          }
          
          // Clean URL - remove query parameters and fragments (but keep pathname)
          if (url) {
            try {
              const urlObj = new URL(url);
              url = urlObj.origin + urlObj.pathname;
            } catch (e) {
              // If URL parsing fails, use as is
            }
          }
          
          // Accept URLs with /ad/, /voitures/, or /motos/
          // BUT: Reject filter/navigation links like /c/voitures/u_car_brand:BMW
          if (!url || (!url.includes('/ad/') && !url.includes('/voitures/') && !url.includes('/motos/'))) {
            console.log('Skipping element - no valid URL', index, 'Element tag:', element.tagName, 'URL:', url);
            return;
          }
          
          // Filter out navigation/filter links (not actual ads)
          // These are links like /c/voitures/u_car_brand:BMW or /recherche?...
          if (url.includes('/c/voitures/u_car_brand:') || 
              url.includes('/c/motos/u_car_brand:') ||
              url.includes('/recherche?') ||
              url.includes('/c/voitures/') && !url.match(/\/voitures\/[a-z0-9-]+$/i) ||
              url.includes('/c/motos/') && !url.match(/\/motos\/[a-z0-9-]+$/i)) {
            console.log('Skipping element - filter/navigation link, not an ad', index, 'URL:', url);
            return;
          }
          
          // Only accept URLs that look like actual ads:
          // - /ad/ followed by alphanumeric ID
          // - /voitures/ followed by alphanumeric slug (not u_car_brand:)
          // - /motos/ followed by alphanumeric slug (not u_car_brand:)
          const isAdUrl = url.match(/\/ad\/[a-z0-9-]+/i) || 
                         url.match(/\/voitures\/[a-z0-9-]+$/i) || 
                         url.match(/\/motos\/[a-z0-9-]+$/i);
          
          if (!isAdUrl) {
            console.log('Skipping element - URL does not match ad pattern', index, 'URL:', url);
            return;
          }
          
          // Extract title - try multiple ways
          let title = '';
          
          // If element is a link, try to get title from link text, title attribute, or aria-label
          if (element.tagName === 'A' || element.tagName === 'a') {
            title = element.textContent?.trim() || 
                   element.getAttribute('title') || 
                   element.getAttribute('aria-label') || 
                   element.getAttribute('alt') || '';
            // Clean title: remove extra whitespace and newlines
            if (title) {
              title = title.replace(/\s+/g, ' ').trim().split('\n')[0].substring(0, 100);
            }
          }
          
          // If still no title, try selectors (for container elements)
          if (!title) {
            const titleSelectors = [
              '[data-qa-id="aditem_title"]',
              'p[data-qa-id="aditem_title"]',
              'h2',
              'span[data-qa-id="aditem_title"]',
              '.aditem_title',
              '[class*="title"]'
            ];
            for (const sel of titleSelectors) {
              const titleEl = element.querySelector(sel);
              if (titleEl && titleEl.textContent) {
                title = titleEl.textContent.trim();
                break;
              }
            }
          }
          
          // If still no title, try getting text from the element itself
          if (!title && element.textContent) {
            title = element.textContent.trim().split('\n')[0].substring(0, 100);
          }
          
          // Clean title: remove duplicates and fix common issues
          if (title) {
            // Remove duplicate text (e.g., "Audi Q7Audi Q7" -> "Audi Q7")
            // Check if title contains the same text twice
            const titleLength = title.length;
            if (titleLength > 10) {
              const halfLength = Math.floor(titleLength / 2);
              const firstHalf = title.substring(0, halfLength).trim();
              const secondHalf = title.substring(halfLength).trim();
              
              // If first half and second half are very similar (80% match), remove duplicate
              if (firstHalf.length > 5 && secondHalf.length > 5) {
                const similarity = calculateSimilarity(firstHalf.toLowerCase(), secondHalf.toLowerCase());
                if (similarity > 0.8) {
                  title = firstHalf; // Use only first half
                  logger.debug('Removed duplicate title', { original: title, cleaned: firstHalf });
                }
              }
            }
            
            // Remove trailing dots and weird characters
            title = title.replace(/\.a$/, '').replace(/\.+$/, '').trim();
            
            // Remove common suffixes that indicate duplication
            title = title.replace(/(.+?)\1+$/g, '$1'); // Remove repeated text at the end
          }
          
          // Extract price - try multiple ways
          let price = 0;
          const priceSelectors = [
            '[data-qa-id="aditem_price"]',
            'span[data-test-id="price"]',
            '.price',
            '[class*="price"]',
            '[class*="Price"]'
          ];
          for (const sel of priceSelectors) {
            const priceEl = element.querySelector(sel);
            if (priceEl && priceEl.textContent) {
              const priceText = priceEl.textContent.trim();
              // Better price parsing: remove all non-digit except spaces and commas, then clean
              const cleanedPrice = priceText.replace(/[^\d\s,]/g, '').trim();
              // Remove spaces, replace comma with nothing (French format: 33 990 €)
              const numericPrice = cleanedPrice.replace(/\s/g, '').replace(',', '');
              const parsedPrice = parseFloat(numericPrice) || 0;
              
              // Validate price: should be between 1k and 150k for used cars
              if (parsedPrice >= 1000 && parsedPrice <= 150000) {
                price = parsedPrice;
                break;
              } else if (parsedPrice > 150000 && parsedPrice < 200000) {
                // Price between 150k-200k: might be valid for very new luxury cars, but log it
                logger.debug('High price detected, might be valid for new luxury vehicle', {
                  price: parsedPrice,
                  url: url
                });
                // Only accept if we can't find a better price
                if (price === 0) {
                  price = parsedPrice;
                }
              }
              // Reject prices > 200k or < 1k
            }
          }
          // If still no price, try to find any number that looks like a price in the element
          if (price === 0 && element.textContent) {
            // Match price pattern: number with spaces/commas followed by €
            // Be more specific to avoid matching other numbers
            // Look for patterns like "33 990 €" or "33990 €" or "7 990 €"
            // Priority: look for prices that are standalone (not part of other text)
            const priceMatches = element.textContent.match(/(\d{1,3}(?:\s?\d{3})*(?:,\d+)?)\s*€/g);
            if (priceMatches && priceMatches.length > 0) {
              // Try all matches and pick the most reasonable one
              // Strategy: prefer lower prices (actual selling price) over higher ones (reference prices)
              let bestPrice = 0;
              const reasonablePrices = [];
              
              for (const match of priceMatches) {
                const priceText = match.replace(/[^\d\s,]/g, '').trim();
                const numericPrice = priceText.replace(/\s/g, '').replace(',', '');
                const parsedPrice = parseFloat(numericPrice) || 0;
                
                // Accept prices between 500 and 200k (reasonable for used cars)
                // Lower bound is 500€ to catch very cheap cars
                if (parsedPrice >= 500 && parsedPrice <= 200000) {
                  reasonablePrices.push(parsedPrice);
                }
              }
              
              // If we found reasonable prices, use the most reasonable one
              // Strategy: prefer prices in the 1k-80k range (typical for used cars)
              // For very old cars (>10 years) or high mileage (>200k km), cap at lower prices
              if (reasonablePrices.length > 0) {
                reasonablePrices.sort((a, b) => a - b);
                
                // Get year and mileage if available (for context-based price validation)
                let vehicleYear = null;
                let vehicleMileage = null;
                if (element.textContent) {
                  const yearMatch = element.textContent.match(/\b(19|20)\d{2}\b/);
                  if (yearMatch) {
                    vehicleYear = parseInt(yearMatch[0]);
                  }
                  const mileageMatch = element.textContent.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i);
                  if (mileageMatch) {
                    vehicleMileage = parseInt(mileageMatch[1].replace(/\s/g, ''));
                  }
                }
                
                // Adjust max price based on vehicle age and mileage
                let maxReasonablePrice = 100000;
                if (vehicleYear) {
                  const currentYear = new Date().getFullYear();
                  const age = currentYear - vehicleYear;
                  if (age > 10) maxReasonablePrice = 30000; // Very old cars: max 30k
                  else if (age > 7) maxReasonablePrice = 50000; // Old cars: max 50k
                  else if (age > 5) maxReasonablePrice = 70000; // Older cars: max 70k
                }
                if (vehicleMileage && vehicleMileage > 200000) {
                  maxReasonablePrice = Math.min(maxReasonablePrice, 40000); // High mileage: cap lower
                }
                
                // Filter to most reasonable range
                const idealRange = reasonablePrices.filter(p => p >= 500 && p <= maxReasonablePrice);
                
                if (idealRange.length > 0) {
                  // Prefer the LOWEST price in ideal range (actual selling price)
                  // Higher prices are often reference prices or "prix neuf"
                  bestPrice = idealRange[0]; // Take the lowest
                  
                  // But if there's a big gap, prefer a price that's more in the middle
                  // (e.g., if we have [7990, 67990], take 7990)
                  if (idealRange.length > 1) {
                    const gap = idealRange[idealRange.length - 1] - idealRange[0];
                    if (gap > idealRange[0] * 5) {
                      // Big gap - likely one is wrong, prefer the lower one
                      bestPrice = idealRange[0];
                    } else {
                      // Prices are close, use median
                      const medianIndex = Math.floor(idealRange.length / 2);
                      bestPrice = idealRange[medianIndex];
                    }
                  }
                } else {
                  // No price in ideal range, use the LOWEST reasonable price
                  // (avoid taking inflated "prix neuf" or other reference prices)
                  bestPrice = reasonablePrices[0];
                  
                  // But if it's way too high for the vehicle, try to find a better one
                  if (bestPrice > maxReasonablePrice * 2) {
                    // Price is way too high, look for a lower alternative
                    const lowerPrice = reasonablePrices.find(p => p <= maxReasonablePrice);
                    if (lowerPrice) {
                      bestPrice = lowerPrice;
                    }
                    // If no lower price found, still use the lowest we have (don't reject)
                  }
                }
                price = bestPrice;
              } else {
                // No reasonable prices found, try all matches and pick the LOWEST one
                // (actual selling price is usually lower than reference prices)
                const allPrices = [];
                for (const match of priceMatches) {
                  const priceText = match.replace(/[^\d\s,]/g, '').trim();
                  const numericPrice = priceText.replace(/\s/g, '').replace(',', '');
                  const parsedPrice = parseFloat(numericPrice) || 0;
                  if (parsedPrice >= 500 && parsedPrice <= 200000) {
                    allPrices.push(parsedPrice);
                  }
                }
                
                if (allPrices.length > 0) {
                  // Sort and take the LOWEST price (actual selling price)
                  allPrices.sort((a, b) => a - b);
                  price = allPrices[0];
                  
                  // If there's a huge gap between lowest and others, the lowest is likely correct
                  // (e.g., 7990 vs 67990 -> take 7990)
                  if (allPrices.length > 1 && allPrices[1] > price * 5) {
                    price = allPrices[0]; // Confirm: take the lowest
                  }
                } else {
                  price = 0; // No valid prices found
                }
              }
            }
          }
          
          // Extract location and department
          let location = '';
          let department = null;
          const locationSelectors = [
            '[data-qa-id="aditem_location"]',
            '.location',
            '[class*="location"]',
            '[class*="Location"]',
            '[data-test-id="location"]',
            'span[class*="location"]',
            'div[class*="location"]'
          ];
          for (const sel of locationSelectors) {
            const locationEl = element.querySelector(sel);
            if (locationEl && locationEl.textContent) {
              location = locationEl.textContent.trim();
              // Try to extract department code from location (e.g., "13000 Marseille" -> "13")
              const deptMatch = location.match(/\b(\d{2})\d{3}\b/); // Postal code pattern
              if (deptMatch) {
                department = deptMatch[1];
              }
              break;
            }
          }
          // If no location found, try to extract from full element text
          if (!location && element.textContent) {
            // Try multiple patterns for location extraction
            // Pattern 1: "City 13000" or "13000 City"
            const locationMatch1 = element.textContent.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+\d{5}/);
            if (locationMatch1) {
              location = locationMatch1[0];
              const deptMatch = location.match(/\b(\d{2})\d{3}\b/);
              if (deptMatch) {
                department = deptMatch[1];
              }
            }
            // Pattern 2: Just postal code "13000" anywhere in text
            if (!department) {
              const postalCodeMatch = element.textContent.match(/\b(\d{2})\d{3}\b/);
              if (postalCodeMatch) {
                department = postalCodeMatch[1];
                // Try to get city name too if possible
                const postalCode = postalCodeMatch[0];
                const cityMatch = element.textContent.match(new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s*${postalCode}|${postalCode}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`));
                if (cityMatch) {
                  location = cityMatch[0];
                } else {
                  location = postalCode;
                }
              }
            }
            // Pattern 3: Look for department names in text (e.g., "Marseille", "Nice", "Toulon")
            if (!department) {
              const cityToDept = {
                'marseille': '13', 'aix-en-provence': '13', 'aix': '13',
                'toulon': '83', 'fréjus': '83', 'draguignan': '83',
                'avignon': '84', 'orange': '84', 'carpentras': '84',
                'nice': '06', 'cannes': '06', 'antibes': '06',
                'gap': '05', 'digne-les-bains': '04'
              };
              const textLower = element.textContent.toLowerCase();
              for (const [city, dept] of Object.entries(cityToDept)) {
                if (textLower.includes(city)) {
                  department = dept;
                  location = city;
                  break;
                }
              }
            }
          }
          
          // Extract year - try multiple sources
          let year = null;
          // First, try to extract from title
          const yearMatchTitle = title.match(/\b(19|20)\d{2}\b/);
          if (yearMatchTitle) {
            year = parseInt(yearMatchTitle[0]);
          }
          // If not found in title, try to extract from full element text
          if (!year && element.textContent) {
            const yearMatchText = element.textContent.match(/\b(19|20)\d{2}\b/);
            if (yearMatchText) {
              year = parseInt(yearMatchText[0]);
            }
          }
          // If still not found, try to find year in common patterns (e.g., "2024 · 38525 km")
          if (!year && element.textContent) {
            const yearPattern = element.textContent.match(/(\d{4})\s*[·•]\s*\d+/);
            if (yearPattern) {
              const candidateYear = parseInt(yearPattern[1]);
              // Sanity check: year should be between 1990 and current year + 1
              const currentYear = new Date().getFullYear();
              if (candidateYear >= 1990 && candidateYear <= currentYear + 1) {
                year = candidateYear;
              }
            }
          }
          
          // Extract mileage - try multiple patterns
          let mileage = null;
          // Pattern 1: "38525 km" or "38 525 km"
          const mileageMatch1 = title.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i);
          if (mileageMatch1) {
            mileage = parseInt(mileageMatch1[1].replace(/\s/g, '')) || null;
          }
          // Pattern 2: "38525km" (no space)
          if (!mileage) {
            const mileageMatch2 = title.match(/(\d{4,})\s*km/i);
            if (mileageMatch2) {
              mileage = parseInt(mileageMatch2[1]) || null;
            }
          }
          // Pattern 3: Look in the full element text, not just title
          if (!mileage && element.textContent) {
            const mileageMatch3 = element.textContent.match(/(\d{1,3}(?:\s?\d{3})*)\s*km/i);
            if (mileageMatch3) {
              mileage = parseInt(mileageMatch3[1].replace(/\s/g, '')) || null;
            }
          }
          
          // Accept listings with either price OR title (some might not have price in the preview)
          // Also accept if we have a valid URL (some listings might not show price/title in preview)
          if (title || price > 0 || url) {
            results.push({
              url,
              title: title || 'No title',
              price: price || 0,
              price_eur: price || 0, // Also include price_eur for compatibility
              year: year || new Date().getFullYear() - 5, // Default if not found
              mileage_km: mileage || 0,
              location,
              location_department: department, // Add department if found
              // Add attributes format for parseListing compatibility
              attributes: {
                'Mileage (km)': mileage || null,
                'First Registration': year ? `${year}` : null
              },
              raw_html: element.outerHTML.substring(0, 500) // Store first 500 chars for debugging
            });
            console.log('Added listing:', { url, title: title ? title.substring(0, 50) : 'No title', price });
          } else {
            console.log('Skipping element - no title, price, or URL', index, 'Element:', element.tagName, element.className);
          }
        } catch (err) {
          console.error('Error extracting listing:', err);
        }
      });
      
      console.log('Total results extracted:', results.length);
      
      // Log debug info if no results
      if (results.length === 0) {
        const debugInfo = {
          bodyText: document.body?.textContent?.substring(0, 1000),
          allLinks: document.querySelectorAll('a').length,
          allDivs: document.querySelectorAll('div').length,
          pageTitle: document.title,
          url: window.location.href,
          hasSearchResults: document.body?.textContent?.includes('annonce') || document.body?.textContent?.includes('résultat'),
          hasNoResults: document.body?.textContent?.includes('Aucun résultat') || document.body?.textContent?.includes('aucun résultat'),
          // Try to find any ad-related elements
          adContainers: document.querySelectorAll('[data-test-id="ad"]').length,
          adLinks: document.querySelectorAll('a[href*="/ad/"]').length,
          vehicleLinks: document.querySelectorAll('a[href*="/voitures/"]').length
        };
        console.log('No results found - debug info:', debugInfo);
        // Return debug info along with empty results
        return { debug: debugInfo, listings: [] };
      }
      
      return results;
    }, maxResults);
    
    // Handle case where Puppeteer returns debug info instead of listings
    if (listings && typeof listings === 'object' && listings.debug && !Array.isArray(listings)) {
      logger.warn('Puppeteer found no listings - debug info', {
        searchUrl,
        debug: listings.debug,
        hasSearchResults: listings.debug?.hasSearchResults,
        hasNoResults: listings.debug?.hasNoResults,
        allLinks: listings.debug?.allLinks,
        adContainers: listings.debug?.adContainers,
        adLinks: listings.debug?.adLinks,
        vehicleLinks: listings.debug?.vehicleLinks,
        resultCountText: listings.debug?.resultCountText,
        pageTitle: listings.debug?.pageTitle,
        bodyTextPreview: listings.debug?.bodyText?.substring(0, 300),
        suggestion: 'The page may require JavaScript that Puppeteer cannot execute, or Leboncoin may be blocking automated requests'
      });
      return [];
    }
    
    // Handle case where results is an object with listings array
    if (listings && typeof listings === 'object' && listings.listings && Array.isArray(listings.listings)) {
      listings = listings.listings;
    }
    
    // Ensure listings is an array
    if (!Array.isArray(listings)) {
      logger.warn('Puppeteer returned non-array result', {
        searchUrl,
        type: typeof listings,
        listings: typeof listings === 'object' ? JSON.stringify(listings).substring(0, 500) : listings
      });
      return [];
    }
    
    logger.info('Puppeteer extracted listings', {
      count: listings.length,
      searchUrl,
      sampleUrls: listings.slice(0, 3).map(l => l?.url || 'no-url')
    });
    
    // Convert to format expected by parseListing
    // Clean titles and extract fuel/transmission from titles
    return listings.map(listing => {
      // Clean title - remove HTML artifacts and extra text
      let cleanTitle = listing.title || '';
      // Remove common HTML artifacts and CSS class names
      cleanTitle = cleanTitle.replace(/\.adcard_[a-f0-9]+/gi, '');
      cleanTitle = cleanTitle.replace(/\{[^}]*\}/g, '');
      cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
      
      // Try to extract fuel type from title
      let fuelType = null;
      const fuelKeywords = {
        'électrique': 'electric',
        'electric': 'electric',
        'hybride': 'hybrid',
        'hybrid': 'hybrid',
        'diesel': 'diesel',
        'essence': 'petrol',
        'petrol': 'petrol',
        'gpl': 'gpl'
      };
      const titleLower = cleanTitle.toLowerCase();
      for (const [keyword, fuel] of Object.entries(fuelKeywords)) {
        if (titleLower.includes(keyword)) {
          fuelType = fuel;
          break;
        }
      }
      
      // Try to extract transmission from title
      let transmission = null;
      if (titleLower.includes('automatique') || titleLower.includes('automatic') || titleLower.includes('bva') || titleLower.includes('dsg') || titleLower.includes('at6') || titleLower.includes('at7')) {
        transmission = 'automatic';
      } else if (titleLower.includes('manuelle') || titleLower.includes('manual') || titleLower.includes('bvm')) {
        transmission = 'manual';
      }
      
      return {
        url: listing.url,
        title: cleanTitle, // Use cleaned title
        price: listing.price_eur || listing.price || 0,
        price_eur: listing.price_eur || listing.price || 0,
        year: listing.year,
        mileage_km: listing.mileage_km || listing.mileage || 0,
        location: listing.location || '',
        location_department: listing.location_department || null,
        // Add attributes for parseListing
        attributes: {
          'Mileage (km)': listing.mileage_km || listing.mileage || null,
          'First Registration': listing.year ? `${listing.year}` : null,
          Fuel: fuelType,
          Transmission: transmission
        },
        fuel_type: fuelType,
        transmission: transmission
      };
    });
    
  } catch (error) {
    logger.error('Error fetching results with Puppeteer', {
      error: error.message,
      searchUrl,
      stack: error.stack
    });
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Simplify URL - remove parameters that might cause issues
 */
function simplifyUrlForSearch(url) {
  try {
    const urlObj = new URL(url);
    
    // Keep essential parameters
    const essentialParams = ['category', 'text', 'search_in', 'locations', 'sort', 'order'];
    
    // Remove potentially problematic parameters that might be too restrictive
    const paramsToRemove = ['year_min', 'year_max', 'mileage_min', 'mileage_max', 'fuel', 'gearbox'];
    
    // Create new URL with only essential params
    const newParams = new URLSearchParams();
    for (const key of essentialParams) {
      if (urlObj.searchParams.has(key)) {
        newParams.set(key, urlObj.searchParams.get(key));
      }
    }
    
    // If we removed important filters, log it
    const removedParams = paramsToRemove.filter(p => urlObj.searchParams.has(p));
    if (removedParams.length > 0) {
      logger.debug('Simplified URL by removing restrictive parameters', {
        originalUrl: url,
        removedParams,
        simplifiedUrl: `${urlObj.origin}${urlObj.pathname}?${newParams.toString()}`
      });
    }
    
    return `${urlObj.origin}${urlObj.pathname}?${newParams.toString()}`;
  } catch (error) {
    logger.warn('Error simplifying URL, using original', {
      url,
      error: error.message
    });
    return url;
  }
}

/**
 * Fetch results from Leboncoin (Puppeteer)
 */
async function fetchResultsWithFallback(searchUrl, maxResults = 100) {
  try {
    const results = await fetchResultsWithPuppeteer(searchUrl, maxResults);
    if (results && Array.isArray(results) && results.length > 0) {
      logger.info('Leboncoin Puppeteer succeeded', { resultCount: results.length, searchUrl });
      return results;
    }
  } catch (err) {
    logger.error('Leboncoin Puppeteer failed', { searchUrl, error: err.message });
  }
  return [];
}

/**
 * Get expanded departments list (target + neighboring departments)
 * Returns departments in order of priority (closest first)
 * 
 * Progressive expansion:
 * Level 0: 13, 83, 84 (target)
 * Level 1: + 04, 05, 06 (immediate PACA neighbors)
 * Level 2: + 30, 34 (Occitanie neighbors)
 * Level 3: + 07, 26 (other close neighbors)
 * Level 4: + 38, 69 (Rhône-Alpes)
 * Level 5: + 11, 12, 30, 31, 32, 34, 48, 66 (more Occitanie)
 * Level 6: + All remaining French departments
 */
function getExpandedDepartments(targetDepartments, expansionLevel = 0) {
  // Define departments by expansion level
  const level0 = [13, 83, 84]; // Target departments
  const level1 = [4, 5, 6]; // Immediate PACA neighbors
  const level2 = [30, 34]; // Occitanie neighbors (Gard, Hérault)
  const level3 = [7, 26]; // Other close neighbors (Ardèche, Drôme)
  const level4 = [38, 69]; // Rhône-Alpes (Isère, Rhône)
  const level5 = [11, 12, 31, 32, 48, 66]; // More Occitanie departments
  const level6 = [1, 2, 3, 8, 9, 10, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 27, 28, 29, 33, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 67, 68, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95]; // All remaining departments
  
  // Start with target departments
  let expanded = [...targetDepartments];
  
  // Add departments based on expansion level
  if (expansionLevel >= 1) {
    expanded = [...new Set([...expanded, ...level1])];
  }
  if (expansionLevel >= 2) {
    expanded = [...new Set([...expanded, ...level2])];
  }
  if (expansionLevel >= 3) {
    expanded = [...new Set([...expanded, ...level3])];
  }
  if (expansionLevel >= 4) {
    expanded = [...new Set([...expanded, ...level4])];
  }
  if (expansionLevel >= 5) {
    expanded = [...new Set([...expanded, ...level5])];
  }
  if (expansionLevel >= 6) {
    expanded = [...new Set([...expanded, ...level6])];
  }
  
  // Remove duplicates and maintain priority order
  const priorityOrder = [
    ...level0, // Target first
    ...level1, // Immediate neighbors
    ...level2, // Occitanie neighbors
    ...level3, // Other close neighbors
    ...level4, // Rhône-Alpes
    ...level5, // More Occitanie
    ...level6  // All others
  ];
  const expandedSet = new Set(expanded);
  return priorityOrder.filter(dept => expandedSet.has(dept));
}

/**
 * Fetch comparables for an auction listing
 * Uses caching (24h TTL) and rate limiting
 * Progressively expands search to neighboring departments if not enough results
 */
export async function fetchComparables(auctionListing, options = {}) {
  const {
    targetDepartments = [13, 83, 84],
    maxResults = 100,
    useCache = true,
    auctionListingId = null,
    minComparables = 8 // Increased from 5 to 8 to ensure we have enough comparables after filtering
  } = options;
  
  // Check cache
  if (useCache) {
    const cacheKey = generateCacheKey(auctionListing, targetDepartments);
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      logger.info('Returning cached comparables', {
        cacheKey,
        count: cached.data.length
      });
      return cached.data;
    }
  }
  
  try {
    // Progressive search: start with target departments, expand if needed
    let expansionLevel = 0;
    let parsedComparables = [];
    let currentDepartments = targetDepartments;
    const searchStartTime = Date.now();
    const MAX_SEARCH_TIME = 90 * 1000; // 90 seconds max for searching comparables
    
    // Reduced max expansion level from 6 to 3 to speed up calculations
    // If no results after 3 expansion levels, it's unlikely to find any
    while (parsedComparables.length < minComparables && expansionLevel <= 3) {
      // Check timeout before each expansion
      if (Date.now() - searchStartTime > MAX_SEARCH_TIME) {
        logger.warn('Search timeout reached, stopping expansion', {
          elapsed: Date.now() - searchStartTime,
          currentCount: parsedComparables.length,
          expansionLevel
        });
        break;
      }
      // Get expanded departments for current level
      currentDepartments = getExpandedDepartments(targetDepartments, expansionLevel);
      
      logger.info('Fetching comparables with expanded departments', {
        expansionLevel,
        departments: currentDepartments,
        targetDepartments,
        currentCount: parsedComparables.length,
        minRequired: minComparables
      });
      
      // Build search URL with current departments
      const searchUrl = buildSearchQuery(auctionListing, currentDepartments);
      
      // Fetch results (Puppeteer)
      const rawResults = await fetchResultsWithFallback(searchUrl, maxResults);
      
      // Ensure rawResults is an array
      if (!rawResults || !Array.isArray(rawResults)) {
        logger.warn('fetchResults returned non-array result', {
          type: typeof rawResults,
          isArray: Array.isArray(rawResults),
          rawResults
        });
        expansionLevel++;
        continue;
      }
      
      // Parse results
      let currentParsed = rawResults
        .map(item => parseListing(item))
        .filter(item => item !== null && item.price_eur > 0 && item.year > 0);
      
      // Filter by current departments (post-filtering since region slugs include all departments in the region)
      // If we're searching in PACA region and a listing has no department extracted, include it anyway
      // (since the search was already filtered by region)
      if (Array.isArray(currentDepartments) && currentDepartments.length > 0) {
        const targetDeptSet = new Set(currentDepartments.map(d => parseInt(d).toString().padStart(2, '0')));
        const pacaDepts = ['13', '83', '84', '04', '05', '06'];
        const isPacaSearch = currentDepartments.some(d => pacaDepts.includes(parseInt(d).toString().padStart(2, '0')));
        
        const beforeFilterCount = currentParsed.length;
        currentParsed = currentParsed.filter(item => {
          const itemDept = item.location_department ? item.location_department.toString().padStart(2, '0') : null;
          // If department is found and matches, include it
          if (itemDept && targetDeptSet.has(itemDept)) {
            return true;
          }
          // If no department extracted but we're searching in PACA and search was filtered by region, include it
          // (the region filter on Leboncoin already ensures it's in PACA)
          if (!itemDept && isPacaSearch && expansionLevel <= 1) {
            // Only for early expansion levels (0-1) to avoid including too many false positives
            return true;
          }
          return false;
        });
        
        if (beforeFilterCount > currentParsed.length) {
          logger.info('Filtered comparables by departments', {
            beforeCount: beforeFilterCount,
            afterCount: currentParsed.length,
            departments: currentDepartments,
            removedCount: beforeFilterCount - currentParsed.length,
            isPacaSearch,
            expansionLevel
          });
        }
      }
      
      // Add to parsed comparables, avoiding duplicates
      const existingUrls = new Set(parsedComparables.map(c => c.url));
      const newComparables = currentParsed.filter(c => !existingUrls.has(c.url));
      parsedComparables = [...parsedComparables, ...newComparables];
      
      logger.info('Progressive search results', {
        expansionLevel,
        departments: currentDepartments,
        foundInThisLevel: newComparables.length,
        totalFound: parsedComparables.length,
        minRequired: minComparables
      });
      
      // If we have enough, stop
      if (parsedComparables.length >= minComparables) {
        break;
      }
      
      // Expand to next level
      expansionLevel++;
    }
    
    // Log final result
    if (parsedComparables.length > 0) {
      logger.info('Final comparables after progressive search', {
        totalFound: parsedComparables.length,
        expansionLevel,
        finalDepartments: currentDepartments,
        targetDepartments
      });
    }
    
    // Helper function to filter by departments
    const filterByDepartments = (comparables) => {
      if (!Array.isArray(targetDepartments) || targetDepartments.length === 0) {
        return comparables;
      }
      const targetDeptSet = new Set(targetDepartments.map(d => parseInt(d).toString().padStart(2, '0')));
      return comparables.filter(item => {
        const itemDept = item.location_department ? item.location_department.toString().padStart(2, '0') : null;
        return itemDept && targetDeptSet.has(itemDept);
      });
    };
    
    // If still not enough results, try progressively more relaxed searches (remove filters)
    // Use the final expanded departments from progressive search
    if (parsedComparables.length < minComparables) {
      // Step 1: Remove fuel and gearbox filters
      if (auctionListing.fuel_type || auctionListing.transmission) {
        logger.info('Not enough results, trying relaxed search (no fuel/gearbox)', {
          currentCount: parsedComparables.length,
          minRequired: minComparables,
          departments: currentDepartments
        });
        
        const relaxedUrl = buildSearchQuery({
          ...auctionListing,
          fuel_type: undefined,
          transmission: undefined
        }, currentDepartments);
        
        const relaxedResults = await fetchResultsWithFallback(relaxedUrl, maxResults);
        if (relaxedResults && Array.isArray(relaxedResults)) {
          const newParsed = relaxedResults
            .map(item => parseListing(item))
            .filter(item => item !== null && item.price_eur > 0 && item.year > 0);
          
          // Filter by current departments
          const targetDeptSet = new Set(currentDepartments.map(d => parseInt(d).toString().padStart(2, '0')));
          const filtered = newParsed.filter(item => {
            const itemDept = item.location_department ? item.location_department.toString().padStart(2, '0') : null;
            return itemDept && targetDeptSet.has(itemDept);
          });
          
          // Add to existing, avoiding duplicates
          const existingUrls = new Set(parsedComparables.map(c => c.url));
          const newComparables = filtered.filter(c => !existingUrls.has(c.url));
          parsedComparables = [...parsedComparables, ...newComparables];
          
          logger.info('Relaxed search results (no fuel/gearbox)', {
            newFound: newComparables.length,
            totalCount: parsedComparables.length,
            relaxedUrl
          });
        }
      }
      
      // Step 2: Remove mileage filter as well
      if (parsedComparables.length < minComparables && auctionListing.mileage) {
        logger.info('Still not enough results, trying without mileage filter', {
          currentCount: parsedComparables.length,
          minRequired: minComparables,
          departments: currentDepartments
        });
        
        const noMileageUrl = buildSearchQuery({
          ...auctionListing,
          fuel_type: undefined,
          transmission: undefined,
          mileage: undefined
        }, currentDepartments);
        
        const noMileageResults = await fetchResultsWithFallback(noMileageUrl, maxResults);
        if (noMileageResults && Array.isArray(noMileageResults)) {
          const newParsed = noMileageResults
            .map(item => parseListing(item))
            .filter(item => item !== null && item.price_eur > 0 && item.year > 0);
          
          // Filter by current departments
          const targetDeptSet = new Set(currentDepartments.map(d => parseInt(d).toString().padStart(2, '0')));
          const filtered = newParsed.filter(item => {
            const itemDept = item.location_department ? item.location_department.toString().padStart(2, '0') : null;
            return itemDept && targetDeptSet.has(itemDept);
          });
          
          // Add to existing, avoiding duplicates
          const existingUrls = new Set(parsedComparables.map(c => c.url));
          const newComparables = filtered.filter(c => !existingUrls.has(c.url));
          parsedComparables = [...parsedComparables, ...newComparables];
          
          logger.info('Relaxed search results (no mileage)', {
            newFound: newComparables.length,
            totalCount: parsedComparables.length,
            noMileageUrl
          });
        }
      }
      
      // Step 3: Remove year filter as well (keep only brand/model and regions)
      if (parsedComparables.length < minComparables) {
        logger.info('Still not enough results, trying brand/model only', {
          currentCount: parsedComparables.length,
          minRequired: minComparables,
          departments: currentDepartments
        });
        
        const brandModelOnlyUrl = buildSearchQuery({
          brand: auctionListing.brand,
          model: auctionListing.model,
          fuel_type: undefined,
          transmission: undefined,
          mileage: undefined,
          year: undefined
        }, currentDepartments);
        
        const brandModelOnlyResults = await fetchResultsWithFallback(brandModelOnlyUrl, maxResults);
        if (brandModelOnlyResults && Array.isArray(brandModelOnlyResults)) {
          const newParsed = brandModelOnlyResults
            .map(item => parseListing(item))
            .filter(item => item !== null && item.price_eur > 0 && item.year > 0);
          
          // Filter by current departments
          const targetDeptSet = new Set(currentDepartments.map(d => parseInt(d).toString().padStart(2, '0')));
          const filtered = newParsed.filter(item => {
            const itemDept = item.location_department ? item.location_department.toString().padStart(2, '0') : null;
            return itemDept && targetDeptSet.has(itemDept);
          });
          
          // Add to existing, avoiding duplicates
          const existingUrls = new Set(parsedComparables.map(c => c.url));
          const newComparables = filtered.filter(c => !existingUrls.has(c.url));
          parsedComparables = [...parsedComparables, ...newComparables];
          
          logger.info('Relaxed search results (brand/model only)', {
            newFound: newComparables.length,
            totalCount: parsedComparables.length,
            brandModelOnlyUrl
          });
        }
      }
    }
    
    // Save to database if auctionListingId provided
    if (auctionListingId && parsedComparables.length > 0) {
      try {
        const comparablesToSave = parsedComparables.map(c => ({
          ...c,
          auction_listing_id: auctionListingId,
          fetched_at: new Date().toISOString()
        }));
        
        const { error } = await supabase
          .from('comparable_listings')
          .insert(comparablesToSave);
        
        if (error) {
          logger.warn('Error saving comparables to database', {
            error: error.message,
            count: comparablesToSave.length
          });
        } else {
          logger.info('Saved comparables to database', {
            count: comparablesToSave.length
          });
        }
      } catch (dbError) {
        logger.warn('Error saving comparables to database', {
          error: dbError.message
        });
      }
    }
    
    // Cache results
    if (useCache) {
      const cacheKey = generateCacheKey(auctionListing, targetDepartments);
      cache.set(cacheKey, {
        data: parsedComparables,
        timestamp: Date.now()
      });
    }
    
    logger.info('Fetched comparables', {
      count: parsedComparables.length,
      auctionListingId
    });
    
    return parsedComparables;
  } catch (error) {
    logger.error('Error fetching comparables', {
      error: error.message,
      auctionListing: {
        brand: auctionListing.brand,
        model: auctionListing.model
      }
    });
    
    // Return empty array on error (graceful degradation)
    return [];
  }
}
