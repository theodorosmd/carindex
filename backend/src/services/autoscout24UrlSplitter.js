/**
 * Service to split AutoScout24 search URLs into multiple sub-searches
 * to bypass the 400 results per URL limitation
 * 
 * Strategy: Divide searches by price ranges, year ranges, or mileage ranges
 */

/**
 * Generate multiple search URLs from a base URL by splitting into price ranges
 * @param {string} baseUrl - Base AutoScout24 search URL
 * @param {number} maxPrice - Maximum price to consider (default: 200000)
 * @param {number} priceStep - Price range step (default: 20000)
 * @returns {Array<string>} Array of URLs with price filters
 */
export function splitByPriceRanges(baseUrl, maxPrice = 200000, priceStep = 20000) {
  const urls = [];
  
  // Clean the base URL first: remove invalid trailing characters like ]
  let cleanedBaseUrl = baseUrl.trim();
  // Remove trailing invalid characters (], [, spaces, etc.)
  cleanedBaseUrl = cleanedBaseUrl.replace(/[\]\[\s]+$/, '');
  
  // Parse the base URL
  let urlObj;
  try {
    urlObj = new URL(cleanedBaseUrl);
  } catch (error) {
    // If URL parsing fails, try to fix common issues
    cleanedBaseUrl = cleanedBaseUrl.replace(/[\]\[#]+$/, '');
    urlObj = new URL(cleanedBaseUrl);
  }
  
  // AutoScout24 uses pr_XXXXX in the pathname for minimum price filter
  // Format: /lst/brand/pr_XXXXX where XXXX is the minimum price
  // We need to remove any existing pr_XXXXX from the pathname
  let pathname = urlObj.pathname;
  
  // Remove existing pr_XXXXX pattern from pathname
  pathname = pathname.replace(/\/pr_\d+/g, '');
  
  // Clean up the URL: remove price-related and specific search parameters
  // These can cause conflicts when splitting
  urlObj.searchParams.delete('priceto');
  urlObj.searchParams.delete('pricefrom');
  urlObj.searchParams.delete('search_id'); // Remove search_id as it's specific to a search session
  urlObj.searchParams.delete('source'); // Remove source parameter
  urlObj.searchParams.delete('sort'); // Remove sort as we want default sorting
  
  // Keep essential parameters that define the search scope
  // atype=C (cars), cy=country, damaged_listing, etc. are kept
  
  // Generate price ranges
  // Some scrapers cannot parse URLs with pr_XXXXX in pathname
  // Use pricefrom and priceto in query params instead
  // Format: /lst/brand?pricefrom=17500&priceto=20000
  for (let from = 0; from < maxPrice; from += priceStep) {
    const to = Math.min(from + priceStep - 1, maxPrice);
    
    // Create a new URL with price filter
    const newUrl = new URL(urlObj.toString());
    
    // Use pricefrom and priceto in query params
    newUrl.searchParams.set('pricefrom', from.toString());
    newUrl.searchParams.set('priceto', to.toString());
    
    // Keep other query params from original URL (like atype, cy, etc.)
    
    urls.push(newUrl.toString());
  }
  
  return urls;
}

/**
 * Generate multiple search URLs from a base URL by splitting into year ranges
 * @param {string} baseUrl - Base AutoScout24 search URL
 * @param {number} minYear - Minimum year (default: 2000)
 * @param {number} maxYear - Maximum year (default: current year)
 * @param {number} yearStep - Year range step (default: 5)
 * @returns {Array<string>} Array of URLs with year filters
 */
export function splitByYearRanges(baseUrl, minYear = 2000, maxYear = new Date().getFullYear(), yearStep = 5) {
  const urls = [];
  
  // Parse the base URL
  const urlObj = new URL(baseUrl);
  
  // Remove existing year filters if any
  urlObj.searchParams.delete('fregfrom');
  urlObj.searchParams.delete('fregto');
  urlObj.searchParams.delete('yearfrom');
  urlObj.searchParams.delete('yearto');
  
  // Generate year ranges
  for (let from = minYear; from <= maxYear; from += yearStep) {
    const to = Math.min(from + yearStep - 1, maxYear);
    
    // Create a new URL with year filter
    const newUrl = new URL(urlObj.toString());
    newUrl.searchParams.set('fregfrom', from.toString());
    newUrl.searchParams.set('fregto', to.toString());
    
    urls.push(newUrl.toString());
  }
  
  return urls;
}

/**
 * Generate multiple search URLs from a base URL by splitting into mileage ranges
 * @param {string} baseUrl - Base AutoScout24 search URL
 * @param {number} maxMileage - Maximum mileage to consider (default: 300000)
 * @param {number} mileageStep - Mileage range step (default: 50000)
 * @returns {Array<string>} Array of URLs with mileage filters
 */
export function splitByMileageRanges(baseUrl, maxMileage = 300000, mileageStep = 50000) {
  const urls = [];
  
  // Parse the base URL
  const urlObj = new URL(baseUrl);
  
  // Remove existing mileage filters if any
  urlObj.searchParams.delete('kmfrom');
  urlObj.searchParams.delete('kmto');
  
  // Generate mileage ranges
  for (let from = 0; from < maxMileage; from += mileageStep) {
    const to = Math.min(from + mileageStep - 1, maxMileage);
    
    // Create a new URL with mileage filter
    const newUrl = new URL(urlObj.toString());
    newUrl.searchParams.set('kmfrom', from.toString());
    newUrl.searchParams.set('kmto', to.toString());
    
    urls.push(newUrl.toString());
  }
  
  return urls;
}

/**
 * Generate multiple search URLs using a combination strategy
 * Uses price ranges as primary splitter (most effective)
 * @param {string} baseUrl - Base AutoScout24 search URL
 * @param {Object} options - Splitting options
 * @returns {Array<string>} Array of URLs
 */
export function generateSplitUrls(baseUrl, options = {}) {
  const {
    strategy = 'price', // 'price', 'year', 'mileage', or 'combined'
    maxPrice = 200000,
    priceStep = 20000,
    minYear = 2000,
    maxYear = new Date().getFullYear(),
    yearStep = 5,
    maxMileage = 300000,
    mileageStep = 50000
  } = options;
  
  switch (strategy) {
    case 'price':
      return splitByPriceRanges(baseUrl, maxPrice, priceStep);
    case 'year':
      return splitByYearRanges(baseUrl, minYear, maxYear, yearStep);
    case 'mileage':
      return splitByMileageRanges(baseUrl, maxMileage, mileageStep);
    case 'combined':
      // For very large datasets, combine price and year
      const priceUrls = splitByPriceRanges(baseUrl, maxPrice, priceStep);
      const allUrls = [];
      
      // For each price range, also split by year (but only for higher price ranges to avoid too many URLs)
      priceUrls.forEach((priceUrl, index) => {
        if (index < priceUrls.length / 2) {
          // For lower price ranges, split by year too
          allUrls.push(...splitByYearRanges(priceUrl, minYear, maxYear, yearStep));
        } else {
          // For higher price ranges, keep as is
          allUrls.push(priceUrl);
        }
      });
      
      return allUrls;
    default:
      return splitByPriceRanges(baseUrl, maxPrice, priceStep);
  }
}

/**
 * Check if a URL needs to be split (if it's too generic)
 * @param {string} url - AutoScout24 search URL
 * @returns {boolean} True if URL should be split
 */
export function shouldSplitUrl(url) {
  try {
    // Clean the URL first to remove invalid characters
    let cleanedUrl = url.trim().replace(/[\]\[\s]+$/, '');
    const urlObj = new URL(cleanedUrl);
    
    // Check if URL is a generic listing search (/lst/brand or /lst/brand/model)
    const pathParts = urlObj.pathname.split('/').filter(p => p); // Remove empty parts
    
    // If it's a listing search (/lst/brand or /lst/brand/model)
    if (pathParts.length >= 2 && pathParts[0] === 'lst') {
      // IMPORTANT: Even if URL has search_id or other specific params,
      // we should still split it because our cleaning function will remove them
      // The presence of pr_XXXXX in pathname indicates it might be a price-filtered search
      // that needs to be split into smaller ranges
      
      // If URL has pr_XXXXX in pathname, it's a price-filtered search that should be split
      if (urlObj.pathname.includes('/pr_')) {
        return true; // Price-filtered search, should be split into smaller ranges
      }
      
      // Count how many specific filters are in the query string
      // (excluding common ones like atype, cy, damaged_listing which are OK)
      const specificFilters = ['make', 'model', 'yearfrom', 'yearto', 
                               'kmfrom', 'kmto', 'fuel', 'transmission', 'doors', 'color'];
      const filterCount = specificFilters.filter(param => urlObj.searchParams.has(param)).length;
      
      // If it's a generic search (few specific filters), it should be split
      // Generic searches typically have 0-2 specific filters
      // Note: search_id, pricefrom, priceto are removed by cleaning, so we ignore them here
      if (filterCount <= 2) {
        return true; // Generic search, should be split
      }
    }
    
    return false;
  } catch (error) {
    // If URL parsing fails, don't split
    return false;
  }
}

