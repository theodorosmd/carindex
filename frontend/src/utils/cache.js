// Simple in-memory cache for API responses
class ApiCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map()
    this.ttl = ttl
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    })
  }

  clear() {
    this.cache.clear()
  }

  generateKey(url, params) {
    const sortedParams = new URLSearchParams(params)
    sortedParams.sort()
    return `${url}?${sortedParams.toString()}`
  }
}

export const apiCache = new ApiCache()








