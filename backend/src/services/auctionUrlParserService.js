import { logger } from '../utils/logger.js';

/**
 * Parse auction URL and extract vehicle data
 * Supports multiple auction sources (KVD, Swedish auctions, etc.)
 */
export async function parseAuctionUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }

  try {
    // Detect source from URL
    const source = detectAuctionSource(url);
    
    logger.info('Parsing auction URL', { url, source });

    switch (source) {
      case 'kvd':
        return await parseKvdUrl(url);
      case 'swedish_auction':
        return await parseSwedishAuctionUrl(url);
      default:
        throw new Error(`Unsupported auction source: ${source}`);
    }
  } catch (error) {
    logger.error('Error parsing auction URL', {
      error: error.message,
      url
    });
    throw error;
  }
}

/**
 * Detect auction source from URL
 */
function detectAuctionSource(url) {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('kvd.se') || lowerUrl.includes('kvd')) {
    return 'kvd';
  }
  if (lowerUrl.includes('auktionsverket.se') || 
      lowerUrl.includes('auctionet.se') ||
      lowerUrl.includes('bilwebauktion.se') ||
      lowerUrl.includes('swedish') ||
      lowerUrl.includes('auktion')) {
    return 'swedish_auction';
  }
  
  // Default to KVD if unknown
  return 'kvd';
}

/**
 * Parse KVD auction URL
 * KVD format: https://www.kvd.se/auktion/...
 */
async function parseKvdUrl(url) {
  try {
    // Fetch the page using native fetch (Node 18+)
    logger.info('Fetching KVD URL', { url });
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      logger.error('Network error fetching KVD URL', {
        error: fetchError.message,
        errorName: fetchError.name,
        errorCode: fetchError.code,
        url
      });
      
      // Provide more specific error messages
      if (fetchError.name === 'AbortError' || fetchError.message.includes('aborted')) {
        throw new Error(`Failed to fetch KVD URL: Request timed out after 30 seconds. The server may be slow or unresponsive.`);
      }
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch failed')) {
        throw new Error(`Failed to fetch KVD URL: Network error. Please check your internet connection and that the URL is accessible. Error: ${fetchError.message}`);
      }
      if (fetchError.code === 'ECONNREFUSED') {
        throw new Error(`Failed to fetch KVD URL: Connection refused. The server may be down or blocking requests.`);
      }
      if (fetchError.code === 'ETIMEDOUT' || fetchError.message.includes('timeout')) {
        throw new Error(`Failed to fetch KVD URL: Request timed out. The server may be slow or unresponsive.`);
      }
      if (fetchError.code === 'ENOTFOUND') {
        throw new Error(`Failed to fetch KVD URL: DNS lookup failed. The domain may not exist or there may be a network issue.`);
      }
      throw new Error(`Failed to fetch KVD URL: ${fetchError.message}`);
    }

    if (!response.ok) {
      logger.error('KVD URL returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
        url
      });
      throw new Error(`Failed to fetch URL: HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract data using regex patterns (KVD specific)
    // KVD uses structured data in JSON-LD or in specific HTML patterns
    const auctionPrice = extractKvdPrice(html);
    
    // Always use fixed auction fee: 1000 EUR (ignore extracted value)
    const auctionFee = 1000;
    logger.info('Using fixed auction fee', { 
      feeEur: auctionFee
    });
    
    // Extract condition notes and VAT info
    const conditionNotes = extractKvdConditionNotes(html);
    const vatDeductible = extractKvdVatDeductible(html);
    const mileageKm = extractKvdMileage(html); // Already in km (converted from Swedish miles)
    const year = extractKvdYear(html);
    const estimatedReconditioning = calculateReconditioningEstimate(conditionNotes, year, mileageKm);
    
    // Extract fuel type and log it
    const fuelType = extractKvdFuelType(html);
    
    // Extract French malus data
    const co2GkmWltp = extractKvdCo2Emissions(html);
    const massKg = extractKvdMass(html);
    const firstRegistrationDate = extractKvdFirstRegistrationDate(html);
    
    // Extract brand (pass URL for better extraction)
    const brand = extractKvdBrand(html, url);
    
    logger.info('Extracted KVD data', {
      brand: brand,
      model: extractKvdModel(html),
      fuel_type: fuelType,
      transmission: extractKvdTransmission(html),
      year: year,
      mileage: mileageKm,
      vat_deductible: vatDeductible, // Log VAT deductible status
      co2_g_km_wltp: co2GkmWltp,
      mass_kg: massKg,
      first_registration_date: firstRegistrationDate
    });
    
    const data = {
      source: 'kvd',
      source_listing_id: extractKvdListingId(url),
      url: url,
      brand: brand,
      model: extractKvdModel(html),
      trim: extractKvdTrim(html),
      year: extractKvdYear(html),
      mileage: extractKvdMileage(html),
      power_hp: extractKvdPower(html),
      fuel_type: fuelType,
      transmission: extractKvdTransmission(html),
      auction_price_sek: auctionPrice,
      auction_fee_eur: Math.round(auctionFee * 100) / 100, // Round to 2 decimals
      color: extractKvdColor(html),
      body_type: extractBodyType(html),
      vin: extractKvdVin(html),
      condition_notes: conditionNotes,
      vat_deductible: vatDeductible,
      estimated_reconditioning_eur: estimatedReconditioning,
      // French malus data
      co2_g_km_wltp: co2GkmWltp,
      mass_kg: massKg,
      first_registration_date: firstRegistrationDate
    };

    // Clean and normalize data
    return normalizeAuctionData(data);
  } catch (error) {
    logger.error('Error parsing KVD URL', { error: error.message, url });
    throw new Error(`Failed to parse KVD URL: ${error.message}`);
  }
}

/**
 * Parse Swedish auction URL (generic)
 */
async function parseSwedishAuctionUrl(url) {
  try {
    // Fetch the page using native fetch (Node 18+)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    
    // Generic Swedish auction parsing
    const data = {
      source: 'swedish_auction',
      source_listing_id: extractListingIdFromUrl(url),
      url: url,
      brand: extractFromHtml(html, /Märke[^:]*:?\s*([^\n<]+)/i) ||
             extractFromHtml(html, /Brand[^:]*:?\s*([^\n<]+)/i) ||
             extractFromHtml(html, /<span[^>]*class="[^"]*brand[^"]*"[^>]*>([^<]+)<\/span>/i),
      model: extractFromHtml(html, /Modell[^:]*:?\s*([^\n<]+)/i) ||
             extractFromHtml(html, /Model[^:]*:?\s*([^\n<]+)/i) ||
             extractFromHtml(html, /<span[^>]*class="[^"]*model[^"]*"[^>]*>([^<]+)<\/span>/i),
      trim: extractFromHtml(html, /Utstyrningsnivå[^:]*:?\s*([^\n<]+)/i) ||
             extractFromHtml(html, /Trim[^:]*:?\s*([^\n<]+)/i) ||
             extractFromHtml(html, /Version[^:]*:?\s*([^\n<]+)/i),
      year: extractYear(html),
      mileage: extractMileage(html),
      power_hp: extractPower(html),
      fuel_type: extractFuelType(html),
      transmission: extractTransmission(html),
      auction_price_sek: extractPrice(html),
      auction_fee_eur: extractAuctionFee(html),
      color: extractColor(html),
      body_type: extractBodyType(html),
      vin: extractVin(html)
    };

    return normalizeAuctionData(data);
  } catch (error) {
    logger.error('Error parsing Swedish auction URL', { error: error.message, url });
    throw new Error(`Failed to parse auction URL: ${error.message}`);
  }
}

/**
 * Extract text from HTML using regex
 */
function extractFromHtml(html, pattern) {
  const match = html.match(pattern);
  if (match && match[1]) {
    return match[1].trim().replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  }
  return null;
}

/**
 * Extract brand from KVD HTML
 */
function extractKvdBrand(html, url = '') {
  // Common brands to look for (including newer brands like Zeekr)
  const brands = ['BMW', 'Mercedes', 'Audi', 'Volvo', 'Volkswagen', 'Toyota', 'Ford', 'Peugeot', 'Renault', 'Citroën', 'Opel', 'Skoda', 'Seat', 'Fiat', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Honda', 'Lexus', 'Porsche', 'Jaguar', 'Land Rover', 'Mini', 'Smart', 'Zeekr', 'ZEEKR', 'Polestar', 'Tesla', 'BYD', 'Nio', 'XPeng'];
  
  // PRIORITY 1: Try URL pattern first (most reliable)
  // KVD URLs often have format: kvd.se/auktioner/zeekr-zeekr-001-...
  if (url) {
    const urlMatch = url.match(/kvd\.se\/[^/]+\/([a-z]+(?:-[a-z]+)*)/i);
    if (urlMatch) {
      const urlBrandPart = urlMatch[1].split('-')[0]; // Get first part before dash
      // Check if it matches a known brand (case-insensitive)
      for (const brand of brands) {
        if (brand.toLowerCase() === urlBrandPart.toLowerCase()) {
          return brand; // Return with correct capitalization
        }
      }
      // If not in list, capitalize first letter and return (for new brands like Zeekr)
      if (urlBrandPart.length > 0) {
        return urlBrandPart.charAt(0).toUpperCase() + urlBrandPart.slice(1).toLowerCase();
      }
    }
  }
  
  // PRIORITY 2: Try structured data (JSON-LD)
  const jsonLdMatch = html.match(/"brand"[:\s]*"([^"]+)"/i) || html.match(/"make"[:\s]*"([^"]+)"/i);
  if (jsonLdMatch) {
    const brandFromJson = jsonLdMatch[1].trim();
    // Check if it matches a known brand
    for (const brand of brands) {
      if (brand.toLowerCase() === brandFromJson.toLowerCase()) {
        return brand;
      }
    }
    // Return as-is if not in list (capitalize first letter)
    return brandFromJson.charAt(0).toUpperCase() + brandFromJson.slice(1).toLowerCase();
  }
  
  // PRIORITY 3: Try title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1];
    for (const brand of brands) {
      if (title.includes(brand)) {
        return brand;
      }
    }
  }
  
  // PRIORITY 4: Try h1 or main heading
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    const h1 = h1Match[1];
    for (const brand of brands) {
      if (h1.includes(brand)) {
        return brand;
      }
    }
  }
  
  return null;
}

/**
 * Extract model from KVD HTML
 */
function extractKvdModel(html) {
  // KVD format: "BMW i4 M50 xDrive" - model is usually after brand
  // Try to extract from title or h1
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1];
    // Pattern: "BMW i4" or "BMW 3 Series" - extract what comes after brand
    const brandModelMatch = title.match(/\b(BMW|Mercedes|Audi|Volvo|Volkswagen|Toyota|Ford|Peugeot|Renault|Citroën)\s+([a-z0-9]+(?:\s+[a-z0-9]+)?)/i);
    if (brandModelMatch && brandModelMatch[2]) {
      let model = brandModelMatch[2].trim();
      // Remove common trim/suffix patterns
      model = model.replace(/\s+M\d+.*$/i, '');
      model = model.replace(/\s+xDrive.*$/i, '');
      model = model.replace(/\s+G\d+.*$/i, '');
      model = model.replace(/\s+AMG.*$/i, '');
      return model.trim();
    }
  }
  
  // Try h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    const h1 = h1Match[1];
    const brandModelMatch = h1.match(/\b(BMW|Mercedes|Audi|Volvo|Volkswagen|Toyota|Ford|Peugeot|Renault|Citroën)\s+([a-z0-9]+(?:\s+[a-z0-9]+)?)/i);
    if (brandModelMatch && brandModelMatch[2]) {
      let model = brandModelMatch[2].trim();
      model = model.replace(/\s+M\d+.*$/i, '');
      model = model.replace(/\s+xDrive.*$/i, '');
      return model.trim();
    }
  }
  
  // Try structured data
  const jsonLdMatch = html.match(/"model"[:\s]*"([^"]+)"/i);
  if (jsonLdMatch) {
    return jsonLdMatch[1].trim();
  }
  
  return null;
}

/**
 * Extract trim from KVD HTML
 */
function extractKvdTrim(html) {
  // KVD shows trim in title: "BMW i4 M50 xDrive, G26, 360 GPS Drag HiFi"
  // Extract from title or h1 after model
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1];
    // Pattern: "BMW i4 M50 xDrive, G26, 360 GPS Drag HiFi" - extract everything after model
    const trimMatch = title.match(/\b(BMW|Mercedes|Audi|Volvo|Volkswagen|Toyota|Ford|Peugeot|Renault|Citroën)\s+[a-z0-9]+(?:\s+[a-z0-9]+)?\s+([^,]+(?:,\s*[^,]+)*)/i);
    if (trimMatch && trimMatch[2]) {
      return trimMatch[2].trim();
    }
  }
  
  // Try h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    const h1 = h1Match[1];
    const trimMatch = h1.match(/\b(BMW|Mercedes|Audi|Volvo|Volkswagen|Toyota|Ford|Peugeot|Renault|Citroën)\s+[a-z0-9]+(?:\s+[a-z0-9]+)?\s+([^,]+(?:,\s*[^,]+)*)/i);
    if (trimMatch && trimMatch[2]) {
      return trimMatch[2].trim();
    }
  }
  
  // Try structured data
  const jsonLdMatch = html.match(/"trim"[:\s]*"([^"]+)"/i) || html.match(/"version"[:\s]*"([^"]+)"/i);
  if (jsonLdMatch) {
    return jsonLdMatch[1].trim();
  }
  
  return null;
}

/**
 * Extract year from KVD HTML
 * Priority: Modellår (Model Year) > Tillverkningsmånad (Manufacturing month) > other patterns
 * Avoids capturing years from dates like "2026-05-31" (inspection dates)
 */
function extractKvdYear(html) {
  const currentYear = new Date().getFullYear();
  const maxValidYear = currentYear + 1; // Allow current year + 1 for new cars
  
  // Priority 1: Look for "Modellår" (Model Year) - most reliable
  const modellarPattern = /Modellår[^<]*?(\d{4})/i;
  const modellarMatch = html.match(modellarPattern);
  if (modellarMatch) {
    const year = parseInt(modellarMatch[1]);
    if (year >= 1990 && year <= maxValidYear) {
      logger.debug('Extracted year from Modellår', { year, source: 'Modellår' });
      return year;
    }
  }
  
  // Priority 2: Look for "Tillverkningsmånad" (Manufacturing month) - format: "april 2023"
  const tillverkningsPattern = /Tillverkningsmånad[^<]*?(\d{4})/i;
  const tillverkningsMatch = html.match(tillverkningsPattern);
  if (tillverkningsMatch) {
    const year = parseInt(tillverkningsMatch[1]);
    if (year >= 1990 && year <= maxValidYear) {
      logger.debug('Extracted year from Tillverkningsmånad', { year, source: 'Tillverkningsmånad' });
      return year;
    }
  }
  
  // Priority 3: Look for "Model Year" (English)
  const modelYearPattern = /Model Year[^:]*:?\s*(\d{4})/i;
  const modelYearMatch = html.match(modelYearPattern);
  if (modelYearMatch) {
    const year = parseInt(modelYearMatch[1]);
    if (year >= 1990 && year <= maxValidYear) {
      logger.debug('Extracted year from Model Year', { year, source: 'Model Year' });
      return year;
    }
  }
  
  // Priority 4: Look for year in "Första datum i trafik" (First registration date) - format: "2023-05-06"
  // But only if it's in the past (not a future inspection date)
  const forstaDatumPattern = /Första datum i trafik[^<]*?(\d{4})-\d{2}-\d{2}/i;
  const forstaDatumMatch = html.match(forstaDatumPattern);
  if (forstaDatumMatch) {
    const year = parseInt(forstaDatumMatch[1]);
    if (year >= 1990 && year <= currentYear) { // Only past years for registration
      logger.debug('Extracted year from Första datum i trafik', { year, source: 'Första datum' });
      return year;
    }
  }
  
  // Priority 5: Look for JSON-LD structured data
  const jsonLdPattern = /"year"[:\s]*"?(\d{4})"?/i;
  const jsonLdMatch = html.match(jsonLdPattern);
  if (jsonLdMatch) {
    const year = parseInt(jsonLdMatch[1]);
    if (year >= 1990 && year <= maxValidYear) {
      logger.debug('Extracted year from JSON-LD', { year, source: 'JSON-LD' });
      return year;
    }
  }
  
  // Last resort: Look for 4-digit years, but exclude dates (YYYY-MM-DD or YYYY-MM format)
  // This pattern avoids matching "2026-05-31" by requiring word boundaries and not followed by "-"
  const fallbackPattern = /\b(20[0-2]\d|19[89]\d)\b(?!\s*[-/])/;
  const fallbackMatch = html.match(fallbackPattern);
  if (fallbackMatch) {
    const year = parseInt(fallbackMatch[1]);
    // Additional validation: exclude years that appear in date contexts
    const matchIndex = fallbackMatch.index;
    const context = html.substring(Math.max(0, matchIndex - 10), Math.min(html.length, matchIndex + 15));
    // If the year is followed by "-" and digits, it's likely a date, skip it
    if (!context.match(/\d{4}-\d{2}/)) {
      if (year >= 1990 && year <= maxValidYear) {
        logger.debug('Extracted year from fallback pattern', { year, source: 'fallback', context });
        return year;
      }
    }
  }
  
  logger.warn('Could not extract year from KVD HTML');
  return null;
}

/**
 * Extract mileage from KVD HTML (Swedish miles to km conversion)
 */
function extractKvdMileage(html) {
  // KVD can use either:
  // 1. Swedish miles (mil): 1 mil = 10 km (older format)
  // 2. Kilometers (km) directly (newer format)
  // Format: "Mätarställning: 11 501 mil" or "Mätarställning: 115 010 km"
  // Also check JSON-LD data for odometerReading (already in km)
  
  // Priority 1: Check for km FIRST (many pages now show km directly)
  // This avoids incorrectly converting km values that are already in km
  const kmPatterns = [
    /Mätarställning[^<]*?(\d{1,3}(?:\s?\d{3})*)\s*km/i,
    /(\d{1,3}(?:\s?\d{3})*)\s*km[^<]*?Mätarställning/i,
    /Mätarställning[^<]*?<\/[^>]*>[^<]*?<[^>]*>([\d\s]+)\s*km/i
  ];
  
  for (const pattern of kmPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const km = parseInt(match[1].replace(/\s/g, ''));
      // Only use if reasonable (>= 10,000 km)
      if (km >= 10000 && km < 1000000) {
        logger.info('Found mileage in km format (direct, no conversion needed)', { 
          km,
          pattern: pattern.toString(),
          originalMatch: match[0].substring(0, 100)
        });
        return km; // Return immediately if we find km
      }
    }
  }
  
  // Priority 2: If no km found, try Swedish miles (mil) and convert
  // Format: "Mätarställning: 19 952 mil" or "Mätarställning 19952 mil"
  // Be very specific to avoid capturing inspection/service mileages
  let htmlMileage = null;
  const patterns = [
    // Priority 1: "Mätarställning" followed by mileage in next span/div (most reliable)
    // Match: "Mätarställning</span>...<span>19 952 mil</span>" or similar HTML structure
    // Capture any sequence of digits and spaces before "mil"
    /Mätarställning[^<]*?<\/[^>]*>[^<]*?<[^>]*>([\d\s]+)\s*mil/i,
    // Priority 2: "Mätarställning" followed by mileage (more flexible, but still specific)
    // Match: "Mätarställning" then any text (but not "Service" or "besiktning"), then number with "mil"
    // Capture any sequence of digits and spaces before "mil"
    /Mätarställning(?![^<]*?(?:Service|besiktning|inspection))[^<]*?([\d\s]+)\s*mil/i,
    // Priority 2: "Miltal" followed by mileage
    /Miltal[^<]*?(\d{1,2}(?:\s?\d{3}){1,2})\s*mil/i,
    // Priority 3: Look for mileage followed by "Mätarställning" or "Miltal"
    /(\d{1,2}(?:\s?\d{3}){1,2})\s*mil[^<]*?(?:Mätarställning|Miltal)/i,
    // Priority 4: Look for "Mätarställning" or "Miltal" within 200 chars of mileage
    /(?:Mätarställning|Miltal|mileage)[^<]{0,200}?(\d{1,2}(?:\s?\d{3}){1,2})\s*mil/i,
    // Priority 5: Direct pattern for formats like "19 952 mil" (with space: 1-2 digits + space + 3-4 digits)
    // But exclude if it's near inspection/service keywords
    /\b(\d{1,2}\s\d{3,4})\s*mil\b(?![^<]*?(?:inspection|service|besiktning|senast))/i,
    // Priority 6: Pattern for "19952 mil" (no space, 4-6 digits total) - must be standalone
    // Exclude if near inspection/service keywords
    /\b(\d{4,6})\s*mil\b(?![^<]*?(?:inspection|service|besiktning|senast))/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Clean the captured string: remove all spaces and non-digit characters
      const milesStr = match[1].trim().replace(/\s/g, '').replace(/[^\d]/g, '');
      const miles = parseInt(milesStr, 10);
      
      // Validate: must be at least 1000 mil (10,000 km) to be a reasonable vehicle mileage
      // This filters out small numbers like "6" that might be captured incorrectly
      if (miles >= 1000 && miles < 1000000) {
        // Convert Swedish miles to km (1 mil = 10 km)
        // Example: 11 501 mil = 115,010 km
        // Example: 19952 mil = 199,520 km
        const km = miles * 10;
        logger.info('Extracted mileage from KVD HTML (Mätarställning)', { 
          miles, 
          km, 
          pattern: pattern.toString(),
          originalMatch: match[0].substring(0, 100),
          captured: match[1]
        });
        htmlMileage = km;
        break; // Use first valid match from HTML
      } else {
        logger.debug('Rejected mileage value (too small or invalid)', {
          miles,
          captured: match[1],
          pattern: pattern.toString()
        });
      }
    }
  }
  
  // Priority 3: Try JSON-LD odometerReading as fallback (if HTML extraction failed)
  let jsonLdMileage = null;
  try {
    const jsonLdMatches = html.match(/"odometerReading"\s*:\s*(\d+)/i);
    if (jsonLdMatches && jsonLdMatches[1]) {
      const odometerKm = parseInt(jsonLdMatches[1]);
      if (odometerKm > 0 && odometerKm < 1000000) {
        jsonLdMileage = odometerKm;
        logger.debug('Found JSON-LD odometerReading', {
          odometerKm,
          source: 'JSON-LD'
        });
      }
    }
  } catch (e) {
    // Ignore JSON parsing errors
  }
  
  // Prefer HTML extraction over JSON-LD (HTML is what user sees on page)
  if (htmlMileage && htmlMileage >= 10000) {
    // Only use HTML mileage if it's reasonable (>= 10,000 km)
    logger.info('Using mileage from HTML Mätarställning', { 
      mileage: htmlMileage,
      source: 'HTML'
    });
    return htmlMileage;
  }
  
  // Fallback to JSON-LD if HTML extraction failed or returned invalid value
  if (jsonLdMileage && jsonLdMileage >= 10000) {
    logger.info('Using mileage from JSON-LD odometerReading (HTML extraction failed or invalid)', { 
      mileage: jsonLdMileage,
      htmlMileage: htmlMileage,
      source: 'JSON-LD'
    });
    return jsonLdMileage;
  }
  
  // If we got HTML mileage but it's too small, log warning
  if (htmlMileage && htmlMileage < 10000) {
    logger.warn('HTML mileage extraction returned invalid value, rejecting', {
      htmlMileage,
      jsonLdMileage
    });
  }
  
  logger.warn('Could not extract valid mileage from KVD HTML', {
    htmlMileage,
    jsonLdMileage
  });
  return null;
}

/**
 * Extract power from KVD HTML
 */
function extractKvdPower(html) {
  // KVD format: "Motoreffekt (el): 544 hk (400 kW)" or "544 hk (400 kW)"
  // Look in the "Teknisk data" section
  const patterns = [
    /Motoreffekt[^<]*?\([^)]*\)[^<]*?(\d{2,4})\s*hk/i,
    /Motoreffekt[^<]{0,100}?(\d{2,4})\s*hk/i,
    /(\d{2,4})\s*hk\s*\([^)]*kW\)[^<]*?Motoreffekt/i,
    /(\d{2,4})\s*hk\s*\([^)]*(\d+)\s*kW\)/i,  // Match "544 hk (400 kW)" format
    // Look for pattern like "544 hk (400 kW)" near "Motoreffekt"
    /Motoreffekt[^<]{0,300}?(\d{2,4})\s*hk[^<]{0,50}?\([^)]*kW\)/i,
    // Direct pattern: "544 hk (400 kW)" format anywhere
    /\b(\d{3,4})\s*hk\s*\([^)]*kW\)/i  // Matches "544 hk (400 kW)"
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const power = parseInt(match[1]);
      if (power > 50 && power < 2000) { // Reasonable range for car power
        logger.debug('Extracted power', { power, pattern: pattern.toString() });
        return power;
      }
    }
  }
  
  // Try kW and convert (look for "400 kW" in context of Motoreffekt)
  const kwPatterns = [
    /Motoreffekt[^<]{0,100}?(\d{2,4})\s*kW/i,
    /(\d{2,4})\s*kW[^<]{0,100}?\([^)]*hk\)/i,
    /Motoreffekt[^<]{0,300}?(\d{2,4})\s*kW[^<]{0,50}?\([^)]*hk\)/i
  ];
  
  for (const pattern of kwPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const kw = parseInt(match[1]);
      if (kw > 30 && kw < 1500) {
        const hp = Math.round(kw * 1.36); // Convert kW to HP (1 kW ≈ 1.36 HP)
        logger.debug('Extracted power from kW', { kw, hp, pattern: pattern.toString() });
        return hp;
      }
    }
  }
  
  logger.warn('Could not extract power from KVD HTML');
  return null;
}

/**
 * Extract fuel type from KVD HTML
 */
function extractKvdFuelType(html) {
  // KVD uses "El" for electric
  const fuelMap = {
    'el': 'electric',
    'elektrisk': 'electric',
    'electric': 'electric',
    'bensin': 'petrol',
    'petrol': 'petrol',
    'essence': 'petrol',
    'diesel': 'diesel',
    'hybrid': 'hybrid',
    'hybride': 'hybrid',
    'gpl': 'gpl',
    'lpg': 'gpl'
  };
  
  const patterns = [
    /Bränsle[^:]*:?\s*([^\n<]+)/i,
    /Fuel[^:]*:?\s*([^\n<]+)/i,
    /\b(El|Bensin|Diesel|Hybrid)\b/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const fuel = match[1].trim().toLowerCase();
      for (const [key, value] of Object.entries(fuelMap)) {
        if (fuel.includes(key)) {
          return value;
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract transmission from KVD HTML
 */
function extractKvdTransmission(html) {
  // KVD uses "Automat" for automatic
  const transmissionMap = {
    'automat': 'automatic',
    'automatic': 'automatic',
    'automatique': 'automatic',
    'manuell': 'manual',
    'manual': 'manual',
    'manuelle': 'manual'
  };
  
  const patterns = [
    /Växellåda[^:]*:?\s*([^\n<]+)/i,
    /Transmission[^:]*:?\s*([^\n<]+)/i,
    /\b(Automat|Manuell)\b/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const transmission = match[1].trim().toLowerCase();
      for (const [key, value] of Object.entries(transmissionMap)) {
        if (transmission.includes(key)) {
          return value;
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract price from KVD HTML
 */
function extractKvdPrice(html) {
  // KVD format: "Ledande bud inkl. moms: 295 500 kr" or "295 500 kr"
  // Look for the leading bid price
  const patterns = [
    /Ledande bud[^:]*:?\s*([\d\s]+)\s*kr/i,
    /Slutpris[^:]*:?\s*([\d\s]+)\s*kr/i,
    /Pris[^:]*:?\s*([\d\s]+)\s*kr/i,
    /(\d{1,3}(?:\s?\d{3}){1,2})\s*kr/i  // Match prices like "295 500 kr"
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/\s/g, ''));
      if (price > 1000 && price < 10000000) { // Reasonable price range
        return price;
      }
    }
  }
  
  // Try structured data
  const jsonLdMatch = html.match(/"price"[:\s]*"?([\d\s]+)"?/i);
  if (jsonLdMatch) {
    const price = parseFloat(jsonLdMatch[1].replace(/\s/g, ''));
    if (price > 1000 && price < 10000000) {
      return price;
    }
  }
  
  return null;
}

/**
 * Extract color from KVD HTML
 */
function extractKvdColor(html) {
  const patterns = [
    /Färg[^:]*:?\s*([^\n<]+)/i,
    /Color[^:]*:?\s*([^\n<]+)/i,
    /Couleur[^:]*:?\s*([^\n<]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const color = match[1].trim();
      // Clean up common suffixes
      return color.split(/[,\n<]/)[0].trim();
    }
  }
  
  return null;
}

/**
 * Extract VIN from KVD HTML
 */
function extractKvdVin(html) {
  // KVD format: "Chassinummer: WBY31AW01PFP01398"
  const patterns = [
    /Chassinummer[^:]*:?\s*([A-HJ-NPR-Z0-9]{17})/i,
    /VIN[^:]*:?\s*([A-HJ-NPR-Z0-9]{17})/i,
    /\b([A-HJ-NPR-Z0-9]{17})\b/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract condition notes from KVD HTML (anmärkningar)
 */
function extractKvdConditionNotes(html) {
  // KVD has a section "Anmärkningsbilder" with condition notes
  // Look for comments like "Flertal lackskador, stenskott, dörruppslag, bucklor och repor"
  const patterns = [
    /Kaross[^<]*?Kommentar[^<]*?([^<]+?)(?:Vad är|<\/)/i,
    /Interiör[^<]*?Kommentar[^<]*?([^<]+?)(?:Vad är|<\/)/i,
    /Däck och fälg[^<]*?Kommentar[^<]*?([^<]+?)(?:Vad är|<\/)/i,
    /Bromsar[^<]*?Kommentar[^<]*?([^<]+?)(?:Vad är|<\/)/i,
    /Kommentar[^<]*?([^<]{20,200}?)(?:Vad är|<\/)/i
  ];
  
  const notes = [];
  for (const pattern of patterns) {
    const matches = html.matchAll(new RegExp(pattern.source, 'gi'));
    for (const match of matches) {
      if (match[1]) {
        const note = match[1].trim();
        if (note.length > 10 && !note.includes('Inga anmärkningar')) {
          notes.push(note);
        }
      }
    }
  }
  
  return notes.length > 0 ? notes.join('; ') : null;
}

/**
 * Extract VAT deductible info from KVD HTML
 */
function extractKvdVatDeductible(html) {
  // KVD format: "Avlyftbar moms: Ja" or "Avlyftbar moms: Nej"
  // Also check for "Kan exporteras: Ja" which often indicates VAT is reclaimable
  const patterns = [
    // Primary pattern: "Avlyftbar moms: Ja/Nej"
    /Avlyftbar\s+moms[^:]*:?\s*(Ja|Nej|Yes|No)/i,
    // Alternative: "Avlyftbar moms" followed by "Ja" or "Nej" on same or next line
    /Avlyftbar\s+moms[^<]*?(Ja|Nej)/i,
    // Check for "Kan exporteras: Ja" (can be exported) - often means VAT reclaimable
    /Kan\s+exporteras[^:]*:?\s*(Ja|Nej)/i,
    // JSON/structured data patterns
    /"vatDeductible"[:\s]*"?(true|false|Ja|Nej)"?/i,
    /"vatDeductible"[:\s]*"?(true|false|Ja|Nej)"?/i,
    // English patterns
    /VAT[^:]*deductible[^:]*:?\s*(Ja|Nej|Yes|No|true|false)/i,
    // Check in "Övrig information" section
    /Övrig\s+information[^<]*?Avlyftbar\s+moms[^<]*?(Ja|Nej)/i,
    // More flexible: look for "moms" near "Ja" or "Nej"
    /(?:Avlyftbar|moms)[^<]{0,100}?(Ja|Nej)/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const value = match[1].toLowerCase();
      const isDeductible = value === 'ja' || value === 'yes' || value === 'true';
      logger.info('Extracted VAT deductible status from KVD', {
        pattern: pattern.toString(),
        matchedValue: match[1],
        isDeductible,
        found: true
      });
      return isDeductible;
    }
  }
  
  // Check if "Kan exporteras: Ja" exists (exportable = usually VAT reclaimable)
  const exportableMatch = html.match(/Kan\s+exporteras[^:]*:?\s*Ja/i);
  if (exportableMatch) {
    logger.info('Vehicle is exportable, assuming VAT is reclaimable', {
      found: true,
      isDeductible: true
    });
    return true; // If exportable, VAT is usually reclaimable
  }
  
  // Default: if not specified, assume VAT is not deductible (margin scheme)
  logger.warn('Could not extract VAT deductible status from KVD, defaulting to false (margin scheme)', {
    found: false,
    isDeductible: false
  });
  return false;
}

/**
 * Calculate reconditioning estimate based on condition notes, year, and mileage
 */
function calculateReconditioningEstimate(conditionNotes, year, mileageKm) {
  let baseCost = 500; // Base reconditioning cost in EUR
  
  // Age factor (older cars need more work)
  const currentYear = new Date().getFullYear();
  const age = year ? currentYear - year : 0;
  if (age > 10) {
    baseCost += 200;
  } else if (age > 5) {
    baseCost += 100;
  }
  
  // Mileage factor
  if (mileageKm) {
    if (mileageKm > 200000) {
      baseCost += 300;
    } else if (mileageKm > 150000) {
      baseCost += 200;
    } else if (mileageKm > 100000) {
      baseCost += 100;
    }
  }
  
  // Condition notes analysis
  if (conditionNotes) {
    const notes = conditionNotes.toLowerCase();
    
    // Paint/body damage
    if (notes.includes('lackskador') || notes.includes('stenskott') || notes.includes('repor') || notes.includes('bucklor')) {
      baseCost += 300; // Paint work
    }
    
    // Tire issues
    if (notes.includes('däck') && (notes.includes('skadat') || notes.includes('slitna') || notes.includes('snedslitna'))) {
      baseCost += 400; // Tire replacement
    }
    
    // Wheel damage
    if (notes.includes('fälg') && (notes.includes('kantstötta') || notes.includes('skrap') || notes.includes('repor'))) {
      baseCost += 200; // Wheel repair/replacement
    }
    
    // Brake issues
    if (notes.includes('broms') && (notes.includes('åtgärd') || notes.includes('byta'))) {
      baseCost += 300; // Brake work
    }
    
    // Interior damage
    if (notes.includes('interiör') && (notes.includes('repor') || notes.includes('märken') || notes.includes('fläckar'))) {
      baseCost += 150; // Interior cleaning/repair
    }
    
    // Multiple issues
    const issueCount = (notes.match(/och|samt|flertal|flera/g) || []).length;
    if (issueCount > 2) {
      baseCost += 200; // Additional work for multiple issues
    }
  }
  
  // Round to nearest 50
  return Math.round(baseCost / 50) * 50;
}

/**
 * Extract year from HTML
 */
function extractYear(html) {
  // Look for year patterns: 2020, 2019, etc.
  const patterns = [
    /Årsmodell[^:]*:?\s*(\d{4})/i,
    /Model Year[^:]*:?\s*(\d{4})/i,
    /Registreringsår[^:]*:?\s*(\d{4})/i,
    /First Registration[^:]*:?\s*(\d{4})/i,
    /(\b(19|20)\d{2}\b)/,
    /<span[^>]*class="[^"]*year[^"]*"[^>]*>(\d{4})<\/span>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const year = parseInt(match[1] || match[0]);
      if (year >= 1900 && year <= new Date().getFullYear() + 1) {
        return year;
      }
    }
  }
  return null;
}

/**
 * Extract mileage from HTML
 */
function extractMileage(html) {
  const patterns = [
    /Miltal[^:]*:?\s*([\d\s]+)\s*(?:mil|km)/i,
    /Mileage[^:]*:?\s*([\d\s]+)\s*(?:mil|km)/i,
    /Mätarställning[^:]*:?\s*([\d\s]+)/i,
    /(\d{1,3}(?:\s?\d{3})*)\s*(?:mil|km)/i,
    /<span[^>]*class="[^"]*mileage[^"]*"[^>]*>([\d\s]+)<\/span>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const mileage = parseInt(match[1].replace(/\s/g, ''));
      if (mileage > 0 && mileage < 1000000) {
        return mileage;
      }
    }
  }
  return null;
}

/**
 * Extract power (HP) from HTML
 */
function extractPower(html) {
  const patterns = [
    /Effekt[^:]*:?\s*(\d+)\s*(?:hk|hp|kW)/i,
    /Power[^:]*:?\s*(\d+)\s*(?:hk|hp|kW)/i,
    /Hästkrafter[^:]*:?\s*(\d+)/i,
    /(\d+)\s*(?:hk|HP)/i,
    /<span[^>]*class="[^"]*power[^"]*"[^>]*>(\d+)<\/span>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const power = parseInt(match[1]);
      if (power > 0 && power < 2000) {
        // If in kW, convert to HP (1 kW ≈ 1.36 HP)
        if (html.match(/kW/i)) {
          return Math.round(power * 1.36);
        }
        return power;
      }
    }
  }
  return null;
}

/**
 * Extract fuel type from HTML
 */
function extractFuelType(html) {
  const fuelMap = {
    'bensin': 'petrol',
    'petrol': 'petrol',
    'essence': 'petrol',
    'diesel': 'diesel',
    'el': 'electric',
    'electric': 'electric',
    'elektrisk': 'electric',
    'hybrid': 'hybrid',
    'hybride': 'hybrid',
    'gpl': 'gpl',
    'lpg': 'gpl'
  };

  const patterns = [
    /Bränsle[^:]*:?\s*([^\n<]+)/i,
    /Fuel[^:]*:?\s*([^\n<]+)/i,
    /Carburant[^:]*:?\s*([^\n<]+)/i,
    /<span[^>]*class="[^"]*fuel[^"]*"[^>]*>([^<]+)<\/span>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const fuel = match[1].trim().toLowerCase();
      for (const [key, value] of Object.entries(fuelMap)) {
        if (fuel.includes(key)) {
          return value;
        }
      }
    }
  }
  return null;
}

/**
 * Extract transmission from HTML
 */
function extractTransmission(html) {
  const transmissionMap = {
    'manuell': 'manual',
    'manual': 'manual',
    'manuelle': 'manual',
    'automat': 'automatic',
    'automatic': 'automatic',
    'automatique': 'automatic'
  };

  const patterns = [
    /Växellåda[^:]*:?\s*([^\n<]+)/i,
    /Transmission[^:]*:?\s*([^\n<]+)/i,
    /Gearbox[^:]*:?\s*([^\n<]+)/i,
    /<span[^>]*class="[^"]*transmission[^"]*"[^>]*>([^<]+)<\/span>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const transmission = match[1].trim().toLowerCase();
      for (const [key, value] of Object.entries(transmissionMap)) {
        if (transmission.includes(key)) {
          return value;
        }
      }
    }
  }
  return null;
}

/**
 * Extract price (SEK) from HTML
 */
function extractPrice(html) {
  const patterns = [
    /Slutpris[^:]*:?\s*([\d\s]+)\s*(?:kr|sek)/i,
    /Final Price[^:]*:?\s*([\d\s]+)\s*(?:kr|sek)/i,
    /Pris[^:]*:?\s*([\d\s]+)\s*(?:kr|sek)/i,
    /Price[^:]*:?\s*([\d\s]+)\s*(?:kr|sek)/i,
    /(\d{1,3}(?:\s?\d{3})*)\s*(?:kr|SEK)/i,
    /<span[^>]*class="[^"]*price[^"]*"[^>]*>([\d\s]+)<\/span>/i,
    /data-price="([\d]+)"/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const price = parseFloat(match[1].replace(/\s/g, ''));
      if (price > 0 && price < 10000000) {
        return price;
      }
    }
  }
  return null;
}

/**
 * Extract auction fee from HTML
 */
function extractAuctionFee(html) {
  // KVD typically doesn't show auction fees on the listing page
  // Fees are usually calculated separately or shown during checkout
  // But let's try to find any mention of fees
  const patterns = [
    /Auktionsavgift[^<]*?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d+)?)\s*(?:kr|sek|eur)/i,
    /Auction Fee[^<]*?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d+)?)\s*(?:kr|sek|eur)/i,
    /Frais[^<]*enchère[^<]*?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d+)?)\s*(?:kr|sek|eur)/i,
    /Avgift[^<]*?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d+)?)\s*(?:kr|sek|eur)/i,
    /Fee[^<]*?(\d{1,3}(?:\s?\d{3})*(?:[,\.]\d+)?)\s*(?:kr|sek|eur)/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let feeStr = match[1].replace(/\s/g, '').replace(',', '.');
      let fee = parseFloat(feeStr);
      // If in SEK, convert to EUR (default rate 0.085)
      const context = html.substring(Math.max(0, match.index - 50), match.index + 200);
      if (context.match(/kr|sek/i)) {
        fee = fee * 0.085;
      }
      if (fee > 0 && fee < 10000) {
        logger.debug('Extracted auction fee', { fee, original: match[1] });
        return Math.round(fee * 100) / 100; // Round to 2 decimals
      }
    }
  }
  
  // KVD typically charges around 2-3% of the bid price as auction fee
  // But we can't calculate it here without the price, so return 0
  // The user can enter it manually or we can calculate it in the frontend
  logger.debug('No auction fee found in HTML, returning 0');
  return 0;
}

/**
 * Extract color from HTML
 */
function extractColor(html) {
  const patterns = [
    /Färg[^:]*:?\s*([^\n<]+)/i,
    /Color[^:]*:?\s*([^\n<]+)/i,
    /Couleur[^:]*:?\s*([^\n<]+)/i,
    /<span[^>]*class="[^"]*color[^"]*"[^>]*>([^<]+)<\/span>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract body type from HTML
 */
function extractBodyType(html) {
  const patterns = [
    /Karosstyp[^:]*:?\s*([^\n<]+)/i,
    /Body Type[^:]*:?\s*([^\n<]+)/i,
    /Type[^:]*:?\s*([^\n<]+)/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract VIN from HTML
 */
function extractVin(html) {
  const vinPattern = /\b([A-HJ-NPR-Z0-9]{17})\b/;
  const match = html.match(vinPattern);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Extract CO₂ emissions (WLTP) from KVD HTML
 * Format: "CO₂-utsläpp: 150 g/km" or "CO₂ emissions: 150 g/km"
 * Also checks for various Swedish terms and HTML structures
 */
function extractKvdCo2Emissions(html) {
  const patterns = [
    // Swedish terms with various formats
    /CO₂[-\s]?utsläpp[^<]*?(\d+)\s*g\/km/i,
    /CO2[-\s]?utsläpp[^<]*?(\d+)\s*g\/km/i,
    /CO₂[-\s]?utsläpp[^:]*:?\s*(\d+)\s*g\/km/i,
    /CO2[-\s]?utsläpp[^:]*:?\s*(\d+)\s*g\/km/i,
    // English terms
    /CO₂[-\s]?emissions[^<]*?(\d+)\s*g\/km/i,
    /CO2[-\s]?emissions[^<]*?(\d+)\s*g\/km/i,
    /CO₂[-\s]?emissions[^:]*:?\s*(\d+)\s*g\/km/i,
    /CO2[-\s]?emissions[^:]*:?\s*(\d+)\s*g\/km/i,
    // Reverse patterns (value before label)
    /(\d+)\s*g\/km[^<]*CO₂/i,
    /(\d+)\s*g\/km[^<]*CO2/i,
    // WLTP patterns
    /WLTP[^<]*?(\d+)\s*g\/km/i,
    /WLTP[^:]*:?\s*(\d+)\s*g\/km/i,
    /(\d+)\s*g\/km[^<]*WLTP/i,
    // HTML structure patterns (common in KVD)
    /<[^>]*>CO₂[^<]*<\/[^>]*>[^<]*<[^>]*>(\d+)\s*g\/km/i,
    /<[^>]*>CO2[^<]*<\/[^>]*>[^<]*<[^>]*>(\d+)\s*g\/km/i,
    // Generic pattern: number followed by "g/km" near CO2-related text
    /(?:CO₂|CO2|WLTP)[^<]{0,100}?(\d+)\s*g\/km/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const co2 = parseInt(match[1]);
      if (co2 >= 0 && co2 <= 500) { // Reasonable range for CO2 emissions
        logger.info('Extracted CO₂ emissions from KVD', { co2_g_km: co2, pattern: pattern.toString() });
        return co2;
      }
    }
  }

  logger.debug('Could not extract CO₂ emissions from KVD HTML');
  return null;
}

/**
 * Extract mass (weight) in kg from KVD HTML
 * Format: "Vikt: 1800 kg" or "Weight: 1800 kg" or "Massa: 1800 kg"
 * Also checks for various Swedish terms and HTML structures
 */
function extractKvdMass(html) {
  const patterns = [
    // Swedish terms with various formats
    /Vikt[^<]*?(\d+)\s*kg/i,
    /Vikt[^:]*:?\s*(\d+)\s*kg/i,
    /Massa[^<]*?(\d+)\s*kg/i,
    /Massa[^:]*:?\s*(\d+)\s*kg/i,
    // English terms
    /Weight[^<]*?(\d+)\s*kg/i,
    /Weight[^:]*:?\s*(\d+)\s*kg/i,
    // Reverse patterns (value before label)
    /(\d+)\s*kg[^<]*Vikt/i,
    /(\d+)\s*kg[^<]*Weight/i,
    /(\d+)\s*kg[^<]*Massa/i,
    // Specific Swedish terms
    /Tjänstevikt[^<]*?(\d+)\s*kg/i, // Service weight
    /Tjänstevikt[^:]*:?\s*(\d+)\s*kg/i,
    /Körfärdig vikt[^<]*?(\d+)\s*kg/i, // Ready-to-drive weight
    /Körfärdig vikt[^:]*:?\s*(\d+)\s*kg/i,
    // HTML structure patterns
    /<[^>]*>Vikt[^<]*<\/[^>]*>[^<]*<[^>]*>(\d+)\s*kg/i,
    /<[^>]*>Massa[^<]*<\/[^>]*>[^<]*<[^>]*>(\d+)\s*kg/i,
    // Generic pattern: number followed by "kg" near weight-related text
    /(?:Vikt|Massa|Weight|Tjänstevikt|Körfärdig vikt)[^<]{0,100}?(\d+)\s*kg/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const mass = parseInt(match[1]);
      if (mass >= 500 && mass <= 5000) { // Reasonable range for vehicle mass
        logger.info('Extracted mass from KVD', { mass_kg: mass, pattern: pattern.toString() });
        return mass;
      }
    }
  }

  logger.debug('Could not extract mass from KVD HTML');
  return null;
}

/**
 * Extract first registration date from KVD HTML
 * Format: "Första datum i trafik i Sverige: 2022-11-24" or "First registration: 2022-11-24"
 * Also handles various date formats and HTML structures
 * Returns date in YYYY-MM-DD format
 */
function extractKvdFirstRegistrationDate(html) {
  const patterns = [
    // Swedish terms with ISO date format (YYYY-MM-DD)
    /Första datum i trafik[^<]*?(\d{4}-\d{2}-\d{2})/i,
    /Första datum i trafik i Sverige[^<]*?(\d{4}-\d{2}-\d{2})/i,
    /Första datum i trafik[^:]*:?\s*(\d{4}-\d{2}-\d{2})/i,
    /Första datum i trafik i Sverige[^:]*:?\s*(\d{4}-\d{2}-\d{2})/i,
    // English terms
    /First registration[^<]*?(\d{4}-\d{2}-\d{2})/i,
    /First registration[^:]*:?\s*(\d{4}-\d{2}-\d{2})/i,
    // Other Swedish terms
    /Första registrering[^<]*?(\d{4}-\d{2}-\d{2})/i,
    /Första registrering[^:]*:?\s*(\d{4}-\d{2}-\d{2})/i,
    /Första registreringsdatum[^<]*?(\d{4}-\d{2}-\d{2})/i,
    /Första registreringsdatum[^:]*:?\s*(\d{4}-\d{2}-\d{2})/i,
    /Registreringsdatum[^<]*?(\d{4}-\d{2}-\d{2})/i,
    /Registreringsdatum[^:]*:?\s*(\d{4}-\d{2}-\d{2})/i,
    // HTML structure patterns
    /<[^>]*>Första datum i trafik[^<]*<\/[^>]*>[^<]*<[^>]*>(\d{4}-\d{2}-\d{2})/i,
    // Generic pattern: date near registration-related text
    /(?:Första datum|First registration|Första registrering)[^<]{0,200}?(\d{4}-\d{2}-\d{2})/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const dateStr = match[1];
      // Validate date format
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const day = parseInt(dateMatch[3]);
        
        // Basic validation
        if (year >= 1990 && year <= new Date().getFullYear() + 1 &&
            month >= 1 && month <= 12 &&
            day >= 1 && day <= 31) {
          logger.info('Extracted first registration date from KVD', { 
            first_registration_date: dateStr,
            pattern: pattern.toString() 
          });
          return dateStr;
        }
      }
    }
  }

  logger.debug('Could not extract first registration date from KVD HTML');
  return null;
}

/**
 * Extract listing ID from KVD URL
 */
function extractKvdListingId(url) {
  const match = url.match(/\/auktion\/(\d+)/) || url.match(/\/lot\/(\d+)/) || url.match(/id[=:](\d+)/);
  return match ? match[1] : url.split('/').pop().split('?')[0];
}

/**
 * Extract listing ID from generic URL
 */
function extractListingIdFromUrl(url) {
  const match = url.match(/\/(\d+)(?:\?|$)/) || url.match(/id[=:](\d+)/);
  return match ? match[1] : url.split('/').pop().split('?')[0];
}

/**
 * Normalize auction data
 */
function normalizeAuctionData(data) {
  return {
    ...data,
    brand: data.brand ? data.brand.trim() : null,
    model: data.model ? data.model.trim() : null,
    trim: data.trim ? data.trim.trim() : null,
    year: data.year || null,
    mileage: data.mileage || null,
    power_hp: data.power_hp || null,
    fuel_type: data.fuel_type || null,
    transmission: data.transmission || null,
    auction_price_sek: data.auction_price_sek || null,
    auction_fee_eur: data.auction_fee_eur || 0,
    color: data.color ? data.color.trim() : null,
    body_type: data.body_type ? data.body_type.trim() : null,
    vin: data.vin || null,
    // French malus data
    co2_g_km_wltp: data.co2_g_km_wltp || null,
    mass_kg: data.mass_kg || null,
    first_registration_date: data.first_registration_date || null
  };
}
