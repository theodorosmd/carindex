const LOGO_PATTERNS = [/logo/i, /brand/i, /favicon/i, /icon/i, /sprite/i, /banner/i, /header.*img/i]
const PLACEHOLDER_PATTERNS = [/placeholder/i, /coming[-_]?soon/i, /preparacion/i, /no[-_]?image/i, /sin[-_]?imagen/i, /default[-_]?(thumb|img|photo)/i, /empty/i, /thumb_default/i]

/** Target resolution for high-quality display (4:3) */
const HIGH_RES = '1920x1440'

/**
 * Transform image URL to higher resolution when the source CDN supports it.
 * AutoScout24: .../xxx.jpg/640x480.webp → .../xxx.jpg/1920x1440.webp
 * mobile.de / similar: ?w=400 → ?w=1200, _thumb → original
 */
export function getHighResImageUrl(url) {
  if (!url || typeof url !== 'string') return url
  try {
    // AutoScout24: prod.pictures.autoscout24.net/.../listing-images/xxx.jpg/640x480.webp
    if (url.includes('pictures.autoscout24') || url.includes('autoscout24.net')) {
      const match = url.match(/^(.+\/listing-images\/[^/]+)\/(\d+x\d+)(\.webp)?(\?.*)?$/i)
      if (match) {
        const base = match[1]
        const ext = match[3] || '.webp'
        const query = match[4] || ''
        return base + '/' + HIGH_RES + ext + query
      }
    }
    // mobile.de / CDN: ?width=400 or ?w=400 → 1200
    if (url.includes('mobile.de') || url.includes('bilder.mobile.de')) {
      return url
        .replace(/([?&])width=\d+/gi, '$1width=1200')
        .replace(/([?&])w=\d+/gi, '$1w=1200')
    }
    // Generic: _thumb, _s, thumbnail in path → try larger variant
    if (/_thumb|_s\.|thumbnail/i.test(url)) {
      return url
        .replace(/_thumb(?=[^a-z]|$)/gi, '')
        .replace(/_s\.(jpg|jpeg|png|webp)/i, '_l.$1')
        .replace(/\/thumbnail\//i, '/')
    }
  } catch (_) {}
  return url
}

function isBadImageUrl(url) {
  if (!url || url.length < 20) return true
  if (LOGO_PATTERNS.some(p => p.test(url))) return true
  if (PLACEHOLDER_PATTERNS.some(p => p.test(url))) return true
  if (url.startsWith('data:') && url.length < 200) return true
  return false
}

export function getListingImage(images) {
  if (!images || !images.length) return null
  for (const url of images) {
    if (isBadImageUrl(url)) continue
    return getHighResImageUrl(url)
  }
  return null
}

export function getFilteredImages(images) {
  if (!images || !images.length) return []
  return images.filter(url => !isBadImageUrl(url)).map(getHighResImageUrl)
}

export function getPlaceholderImageUrl(brand, model, width = 800, height = 600) {
  const text = encodeURIComponent((brand || '') + ' ' + (model || 'Car'))
  return `https://via.placeholder.com/${width}x${height}?text=${text}`
}
