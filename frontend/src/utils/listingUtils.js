const LOGO_PATTERNS = [/logo/i, /brand/i, /favicon/i, /icon/i, /sprite/i, /banner/i, /header.*img/i]
const PLACEHOLDER_PATTERNS = [/placeholder/i, /coming[-_]?soon/i, /preparacion/i, /no[-_]?image/i, /sin[-_]?imagen/i, /default[-_]?(thumb|img|photo)/i, /empty/i, /thumb_default/i]

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
    return url
  }
  return null
}

export function getFilteredImages(images) {
  if (!images || !images.length) return []
  return images.filter(url => !isBadImageUrl(url))
}

export function getPlaceholderImageUrl(brand, model, width = 800, height = 600) {
  const text = encodeURIComponent((brand || '') + ' ' + (model || 'Car'))
  return `https://via.placeholder.com/${width}x${height}?text=${text}`
}
