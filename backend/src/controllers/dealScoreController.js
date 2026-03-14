import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { marketPriceCache } from '../utils/cache.js';
import { calculateImportCosts } from '../services/importCostCalculator.js';

// ─── deal tier definitions ────────────────────────────────────────────────────

const DEAL_TIERS = [
  { maxPct: -20, label: 'Exceptional Deal', labelFr: 'Offre exceptionnelle', color: 'green',  badge: 'exceptional' },
  { maxPct: -10, label: 'Excellent Deal',   labelFr: 'Excellente affaire',    color: 'green',  badge: 'excellent'   },
  { maxPct:  -5, label: 'Good Deal',        labelFr: 'Bonne affaire',         color: 'teal',   badge: 'good'        },
  { maxPct:   5, label: 'Fair Price',       labelFr: 'Prix correct',          color: 'gray',   badge: 'fair'        },
  { maxPct:  15, label: 'Slightly High',    labelFr: 'Légèrement cher',       color: 'orange', badge: 'high'        },
  { maxPct: Infinity, label: 'Overpriced', labelFr: 'Trop cher',             color: 'red',    badge: 'overpriced'  },
];

function getDealTier(pct) {
  return DEAL_TIERS.find(t => pct < t.maxPct) ?? DEAL_TIERS[DEAL_TIERS.length - 1];
}

function getConfidenceLabel(index) {
  if (index >= 70) return { label: 'High',   labelFr: 'Élevée',  color: 'green'  };
  if (index >= 40) return { label: 'Medium', labelFr: 'Moyenne', color: 'yellow' };
  return                 { label: 'Low',    labelFr: 'Faible',  color: 'red'    };
}

// ─── fast market price calculation ───────────────────────────────────────────
// Uses eq() with lowercased brand/model so the B-tree composite index is hit.
// idx_listings_market_price_lookup covers (brand, model, year, location_country, mileage, price).

async function computeMarketPrice({ brand, model, year, mileage, country, fuel_type, transmission }) {
  // Cache key
  const cacheKey = marketPriceCache.generateKey('deal_score_v2', {
    brand, model, year, country: country || 'all', fuel_type, transmission
  });
  const cached = marketPriceCache.get(cacheKey);
  if (cached) {
    // Mileage adjustment on cached result
    if (cached.market_price && mileage != null) {
      const mileageDiff = mileage - (cached.base_mileage || 80000);
      const priceAdj = (mileageDiff / 1000) * 50; // ~€50 per 1000 km
      return { ...cached, market_price: Math.max(0, cached.market_price - priceAdj) };
    }
    return cached;
  }

  // PERFORMANCE NOTE: adding location_country or year range to the SQL query
  // causes the planner to bypass the (brand, model, ...) index and do a slow
  // sequential scan (~7s+). Instead, fetch brand+model+status rows (1.5s for
  // 1000 rows) and apply all other filters in-memory. This is safe because the
  // typical result set after filtering is well under the 1000-row limit.

  const q = supabase
    .from('listings')
    .select('price, year, mileage, location_country, fuel_type, transmission')
    .eq('brand', brand)
    .eq('model', model)
    .eq('status', 'active')
    .gt('price', 0)
    .not('price', 'is', null)
    .limit(1000);

  const { data, error } = await q;

  if (error) throw error;

  // In-memory filters: year ±2, country, fuel_type, transmission
  const rows = (data || []).filter(r => {
    if (!r.price || r.price <= 0) return false;
    if (Math.abs(r.year - year) > 2) return false;
    if (country && r.location_country !== country) return false;
    if (fuel_type && r.fuel_type && r.fuel_type !== fuel_type) return false;
    if (transmission && r.transmission && r.transmission !== transmission) return false;
    return true;
  });

  if (rows.length < 3) {
    return {
      market_price: null, confidence_index: 0,
      comparables_count: rows.length,
      price_range: null, base_mileage: mileage,
      last_updated: new Date().toISOString(),
    };
  }

  // IQR outlier removal
  const sorted = rows.map(r => parseFloat(r.price)).sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const clean = sorted.filter(p => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);
  const prices = clean.length >= 3 ? clean : sorted;

  // Median
  const median = prices[Math.floor(prices.length / 2)];
  const p25 = prices[Math.floor(prices.length * 0.25)];
  const p75 = prices[Math.floor(prices.length * 0.75)];

  // Confidence score
  const countScore    = Math.min(50, (prices.length / 50) * 50);
  const variance      = (prices[prices.length - 1] - prices[0]) / median;
  const varianceScore = Math.max(0, 30 - variance * 30);
  const confidence    = Math.round(Math.min(100, countScore + varianceScore + 15));

  const result = {
    market_price:      Math.round(median),
    confidence_index:  confidence,
    comparables_count: prices.length,
    price_range: {
      min:    Math.round(prices[0]),
      max:    Math.round(prices[prices.length - 1]),
      p25:    Math.round(p25),
      median: Math.round(median),
      p75:    Math.round(p75),
    },
    base_mileage: mileage ?? 80000,
    last_updated: new Date().toISOString(),
  };

  marketPriceCache.set(cacheKey, result);

  // Mileage adjustment vs 80k baseline
  if (mileage != null) {
    const mileageDiff = mileage - 80000;
    const adj = (mileageDiff / 1000) * 50;
    return { ...result, market_price: Math.max(0, result.market_price - adj) };
  }
  return result;
}

// ─── normalize brand/model input ──────────────────────────────────────────────
// DB stores lowercase; user may send "Volkswagen" or "VOLKSWAGEN"

function normalizeInput(str) {
  return (str || '').trim().toLowerCase();
}

// ─── controller ───────────────────────────────────────────────────────────────

export async function getDealScore(req, res, next) {
  try {
    const {
      brand: rawBrand,
      model: rawModel,
      year,
      mileage,
      country,
      fuel_type,
      transmission,
      price, // listing price to score — optional
    } = req.query;

    if (!rawBrand || !rawModel || !year) {
      return res.status(400).json({ error: 'brand, model, and year are required' });
    }

    const brand         = normalizeInput(rawBrand);
    const model         = normalizeInput(rawModel);
    const parsedYear    = parseInt(year, 10);
    const parsedMileage = mileage ? parseInt(mileage, 10) : null;

    if (isNaN(parsedYear) || parsedYear < 1990 || parsedYear > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const marketData = await computeMarketPrice({
      brand,
      model,
      year: parsedYear,
      mileage: parsedMileage,
      country: country || null,
      fuel_type: fuel_type || null,
      transmission: transmission || null,
    });

    const confidenceLabel = getConfidenceLabel(marketData.confidence_index);

    const response = {
      brand:             rawBrand.trim(),
      model:             rawModel.trim(),
      year:              parsedYear,
      mileage:           parsedMileage,
      country:           country || null,
      market_price:      marketData.market_price,
      currency:          'EUR',
      price_range:       marketData.price_range,
      confidence_index:  marketData.confidence_index,
      confidence_label:  confidenceLabel,
      comparables_count: marketData.comparables_count,
      last_updated:      marketData.last_updated,
    };

    // Compute deal score when listing price provided
    if (price !== undefined && price !== '' && marketData.market_price) {
      const listingPrice = parseFloat(price);
      if (!isNaN(listingPrice) && listingPrice > 0) {
        const pct = ((listingPrice - marketData.market_price) / marketData.market_price) * 100;
        const tier = getDealTier(pct);
        response.deal_score = {
          listing_price:  Math.round(listingPrice),
          market_price:   marketData.market_price,
          vs_market_pct:  Math.round(pct * 10) / 10,
          savings:        Math.round(marketData.market_price - listingPrice),
          label:          tier.label,
          label_fr:       tier.labelFr,
          color:          tier.color,
          badge:          tier.badge,
        };
      }
    }

    logger.info('Deal score computed', {
      brand, model, year: parsedYear, country,
      market_price: marketData.market_price,
      comparables: marketData.comparables_count,
    });

    res.json(response);
  } catch (error) {
    logger.error('Error computing deal score', { error: error.message });
    next(error);
  }
}

// ─── cross-country price comparison ───────────────────────────────────────────
// Public endpoint: returns median price per country + import cost to sell_country
// Single SQL query (brand+model+status only), all filtering done in-memory

export async function getMarketPriceComparison(req, res, next) {
  try {
    const { brand: rawBrand, model: rawModel, year, sell_country } = req.query;

    if (!rawBrand || !rawModel || !year) {
      return res.status(400).json({ error: 'brand, model, and year are required' });
    }

    const brand      = normalizeInput(rawBrand);
    const model      = normalizeInput(rawModel);
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedYear) || parsedYear < 1990) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const sellCountry = (sell_country || '').toUpperCase().slice(0, 2) || null;

    // Single query (no country filter — preserves index performance)
    const { data, error } = await supabase
      .from('listings')
      .select('price, year, location_country')
      .eq('brand', brand)
      .eq('model', model)
      .eq('status', 'active')
      .gt('price', 0)
      .not('price', 'is', null)
      .limit(2000);

    if (error) throw error;

    // Filter year ±3 in-memory
    const rows = (data || []).filter(r => r.price > 0 && Math.abs(r.year - parsedYear) <= 3);

    // Group prices by country
    const byCountry = {};
    for (const r of rows) {
      if (!r.location_country) continue;
      if (!byCountry[r.location_country]) byCountry[r.location_country] = [];
      byCountry[r.location_country].push(r.price);
    }

    // Compute median + IQR cleanup per country
    function computeMedian(prices) {
      const sorted = [...prices].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const clean = sorted.filter(p => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);
      const ps = clean.length >= 3 ? clean : sorted;
      return {
        median: Math.round(ps[Math.floor(ps.length / 2)]),
        p25:    Math.round(ps[Math.floor(ps.length * 0.25)]),
        p75:    Math.round(ps[Math.floor(ps.length * 0.75)]),
        count:  ps.length,
      };
    }

    // Build per-country results
    const countryResults = [];
    for (const [country, prices] of Object.entries(byCountry)) {
      if (prices.length < 3) continue;
      const stats = computeMedian(prices);

      let importCosts = null;
      let importBreakdown = null;
      let totalCostInSellCountry = null;

      if (sellCountry && country !== sellCountry) {
        try {
          const ic = calculateImportCosts(stats.median, country, sellCountry, { isProfessional: false });
          importCosts = ic.totalCost;
          totalCostInSellCountry = ic.costToSellCountry;
          importBreakdown = ic.breakdown;
        } catch (_) {
          // country pair not in distance matrix — skip
        }
      } else if (sellCountry && country === sellCountry) {
        importCosts = 0;
        totalCostInSellCountry = stats.median;
      }

      countryResults.push({
        country,
        median_price: stats.median,
        p25: stats.p25,
        p75: stats.p75,
        count: stats.count,
        confidence: Math.min(100, Math.round(Math.min(50, (stats.count / 50) * 50) + 15)),
        import_costs: importCosts,
        import_breakdown: importBreakdown,
        total_cost_in_sell_country: totalCostInSellCountry,
        net_margin: null,
        net_margin_pct: null,
      });
    }

    // Get sell country median to compute net margins
    const sellEntry = sellCountry ? countryResults.find(r => r.country === sellCountry) : null;
    const sellMedian = sellEntry?.median_price ?? null;

    for (const r of countryResults) {
      if (sellMedian && r.total_cost_in_sell_country != null && r.country !== sellCountry) {
        r.net_margin = Math.round(sellMedian - r.total_cost_in_sell_country);
        r.net_margin_pct = r.total_cost_in_sell_country > 0
          ? Math.round((r.net_margin / r.total_cost_in_sell_country) * 100 * 10) / 10
          : 0;
      }
    }

    // Sort: profitable first, then by net_margin desc
    countryResults.sort((a, b) => {
      const aM = a.net_margin ?? -Infinity;
      const bM = b.net_margin ?? -Infinity;
      return bM - aM;
    });

    res.json({
      brand:             rawBrand.trim(),
      model:             rawModel.trim(),
      year:              parsedYear,
      sell_country:      sellCountry,
      sell_median_price: sellMedian,
      total_listings:    rows.length,
      countries:         countryResults,
    });
  } catch (error) {
    logger.error('Error in market price comparison', { error: error.message });
    next(error);
  }
}
