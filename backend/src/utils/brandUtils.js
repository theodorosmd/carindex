/**
 * Brand/model parsing utilities.
 * Handles multi-word brand names that would be incorrectly split by a naive
 * title.split(' ')[0] approach.
 */

/** Multi-word car brand names (lowercase). Order matters for prefix matching. */
export const KNOWN_MULTI_WORD_BRANDS = [
  'alfa romeo',
  'aston martin',
  'land rover',
  'rolls royce',
  'rolls-royce',
  'mercedes benz',
  'mercedes-benz',
  'great wall',
  'ds automobiles',
  'de tomaso',
  'morgan plus',
  'tvr griffith',
  'bugatti veyron',
  'alpine renault',
];

/**
 * Parse brand and model from a free-text title string.
 * Tries multi-word brand prefixes first, falls back to first-word-as-brand.
 *
 * @param {string} title - e.g. "Land Rover Discovery 3.0 TDV6"
 * @returns {{ brand: string|null, model: string|null }}
 */
export function parseBrandModelFromTitle(title) {
  if (!title || typeof title !== 'string') return { brand: null, model: null };

  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();

  for (const brand of KNOWN_MULTI_WORD_BRANDS) {
    if (lower.startsWith(brand + ' ') || lower === brand) {
      return {
        brand: brand,
        model: trimmed.slice(brand.length).trim() || null
      };
    }
  }

  const parts = trimmed.split(/\s+/);
  return {
    brand: parts[0]?.toLowerCase() || null,
    model: parts.slice(1).join(' ') || null
  };
}
