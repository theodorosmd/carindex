/**
 * Simple in-memory cache for API responses
 * For production, consider using Redis
 */

class SimpleCache {
  constructor(maxAge = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.maxAge = maxAge;
  }

  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  // Clear entries older than maxAge
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Create cache instances for different use cases
export const facetsCache = new SimpleCache(10 * 60 * 1000); // 10 minutes for facets
export const marketPriceCache = new SimpleCache(30 * 60 * 1000); // 30 minutes for market prices

// Cleanup old entries every 5 minutes
setInterval(() => {
  facetsCache.cleanup();
  marketPriceCache.cleanup();
}, 5 * 60 * 1000);







