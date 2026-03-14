import { calculateMarketPrice } from '../services/marketPriceService.js';
import { logger } from '../utils/logger.js';

const DEAL_TIERS = [
  { maxPct: -20, label: 'Exceptional Deal', labelFr: 'Offre exceptionnelle', color: 'green',  badge: 'exceptional' },
  { maxPct: -10, label: 'Excellent Deal',   labelFr: 'Excellente affaire',    color: 'green',  badge: 'excellent'   },
  { maxPct:  -5, label: 'Good Deal',        labelFr: 'Bonne affaire',          color: 'teal',   badge: 'good'        },
  { maxPct:   5, label: 'Fair Price',       labelFr: 'Prix correct',           color: 'gray',   badge: 'fair'        },
  { maxPct:  15, label: 'Slightly High',    labelFr: 'Légèrement cher',        color: 'orange', badge: 'high'        },
  { maxPct: Infinity, label: 'Overpriced', labelFr: 'Trop cher',              color: 'red',    badge: 'overpriced'  },
];

function getDealTier(pct) {
  return DEAL_TIERS.find(t => pct < t.maxPct) ?? DEAL_TIERS[DEAL_TIERS.length - 1];
}

function getConfidenceLabel(index) {
  if (index >= 70) return { label: 'High', labelFr: 'Élevée', color: 'green' };
  if (index >= 40) return { label: 'Medium', labelFr: 'Moyenne', color: 'yellow' };
  return { label: 'Low', labelFr: 'Faible', color: 'red' };
}

export async function getDealScore(req, res, next) {
  try {
    const {
      brand,
      model,
      year,
      mileage,
      country,
      fuel_type,
      transmission,
      price, // optional — listing price to score
    } = req.query;

    if (!brand || !model || !year) {
      return res.status(400).json({
        error: 'brand, model, and year are required',
      });
    }

    const parsedYear    = parseInt(year, 10);
    const parsedMileage = mileage ? parseInt(mileage, 10) : 80000; // default avg mileage

    if (isNaN(parsedYear) || parsedYear < 1990 || parsedYear > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    if (mileage && (isNaN(parsedMileage) || parsedMileage < 0)) {
      return res.status(400).json({ error: 'Invalid mileage' });
    }

    const marketData = await calculateMarketPrice({
      brand,
      model,
      year: parsedYear,
      mileage: parsedMileage,
      country: country || undefined,
      fuel_type: fuel_type || undefined,
      transmission: transmission || undefined,
    });

    const confidenceLabel = getConfidenceLabel(marketData.confidence_index);

    const response = {
      brand,
      model,
      year: parsedYear,
      mileage: parsedMileage,
      country: country || null,
      market_price: marketData.market_price,
      currency: 'EUR',
      price_range: marketData.price_range,
      confidence_index: marketData.confidence_index,
      confidence_label: confidenceLabel,
      comparables_count: marketData.comparables_count,
      last_updated: marketData.last_updated,
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
