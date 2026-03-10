import { supabase } from '../config/supabase.js';
import { calculateMarketPrice } from './marketPriceService.js';
import { getListingSources } from './listingSourcesService.js';
import { expandFuelCanonicalToRaw, expandTransmissionCanonicalToRaw } from '../utils/listingNormalize.js';

export async function searchListingsService(filters, userPlan = null) {
  const {
    query: searchQuery,
    brand,
    model,
    min_price,
    max_price,
    min_year,
    max_year,
    min_mileage,
    max_mileage,
    country,
    fuel_type,
    transmission,
    steering,
    doors,
    seller_type,
    color,
    keyword,
    publication_date,
    sort = 'date',
    limit = 20,
    offset = 0
  } = filters;

  try {
    // Optimize: Only select necessary columns for listing cards
    // Full details can be fetched separately if needed
    // Include specifications to extract mileage if mileage field is 0/null
    // Include price drop fields for badge display
    const selectColumns = 'id, brand, model, year, mileage, price, currency, location_city, location_region, location_country, fuel_type, transmission, steering, doors, color, url, images, posted_date, source_platform, status, specifications, price_drop_pct, price_drop_amount, last_price_drop_date';
    
    // Start building the query
    // Use 'planned' count for large tables (509K+ rows) - exact count triggers statement timeout
    const countOption = 'planned';
    let query = supabase
      .from('listings')
      .select(selectColumns, { count: countOption })
      .eq('status', 'active');

    // Text search using full-text search
    if (searchQuery) {
      // Supabase supports full-text search via .textSearch()
      // Note: This requires a text search column or we use ilike for simple search
      query = query.or(`brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Brand (support array)
    if (brand) {
      const brands = Array.isArray(brand) ? brand : [brand];
      query = query.in('brand', brands.map(b => b.toLowerCase()));
    }

    // Model (support array)
    if (model) {
      const models = Array.isArray(model) ? model : [model];
      query = query.in('model', models.map(m => m.toLowerCase()));
    }

    // Price range
    if (min_price) {
      query = query.gte('price', min_price);
    }
    if (max_price) {
      query = query.lte('price', max_price);
    }

    // Year range
    if (min_year) {
      query = query.gte('year', min_year);
    }
    if (max_year) {
      query = query.lte('year', max_year);
    }

    // Mileage range
    if (min_mileage) {
      query = query.gte('mileage', min_mileage);
    }
    if (max_mileage) {
      query = query.lte('mileage', max_mileage);
    }

    // Country
    if (country) {
      query = query.eq('location_country', country);
    }

    // Fuel type (support array) - expand canonical (DIESEL, PETROL) to raw DB values
    if (fuel_type) {
      const canonicals = Array.isArray(fuel_type) ? fuel_type.filter(Boolean) : [fuel_type];
      const rawValues = canonicals.flatMap(c => expandFuelCanonicalToRaw(c)).filter(Boolean);
      if (rawValues.length > 0) query = query.in('fuel_type', rawValues);
    }

    // Transmission (support array) - expand canonical (AUTOMATIC, MANUAL) to raw DB values
    if (transmission) {
      const canonicals = Array.isArray(transmission) ? transmission.filter(Boolean) : [transmission];
      const rawValues = canonicals.flatMap(c => expandTransmissionCanonicalToRaw(c)).filter(Boolean);
      if (rawValues.length > 0) query = query.in('transmission', rawValues);
    }

    // Steering (support array) - LHD / RHD only
    if (steering) {
      const steerings = Array.isArray(steering) ? steering : [steering];
      const steeringMap = { left: 'LHD', right: 'RHD' };
      const mapped = steerings.map(s => steeringMap[s] || s).filter(Boolean);
      if (mapped.length > 0) query = query.in('steering', mapped);
    }

    // Doors (support array)
    if (doors) {
      const doorsArray = Array.isArray(doors) ? doors : [doors];
      query = query.in('doors', doorsArray.map(d => parseInt(d)));
    }

    // Seller type (support array)
    if (seller_type) {
      const sellerTypes = Array.isArray(seller_type) ? seller_type : [seller_type];
      const sellerTypeMap = {
        'private': 'private',
        'professional': 'professional'
      };
      const mappedSellerTypes = sellerTypes.map(s => sellerTypeMap[s] || s);
      query = query.in('seller_type', mappedSellerTypes);
    }

    // Color
    if (color && color !== 'any') {
      query = query.ilike('color', color);
    }

    // Version (support array)
    if (filters.version) {
      const versions = Array.isArray(filters.version) ? filters.version : [filters.version];
      query = query.in('version', versions);
    }

    // Trim (finition) (support array)
    if (filters.trim) {
      const trims = Array.isArray(filters.trim) ? filters.trim : [filters.trim];
      query = query.in('trim', trims);
    }

    // Keyword
    if (keyword) {
      query = query.or(`brand.ilike.%${keyword}%,model.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    }

    // Publication date (recent = < 30 days, old = >= 30 days or null)
    if (publication_date === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('posted_date', thirtyDaysAgo.toISOString());
    } else if (publication_date === 'old') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.or(`posted_date.lt.${thirtyDaysAgo.toISOString()},posted_date.is.null`);
    }

    // Sorting
    // Apply sorting BEFORE pagination to ensure correct order
    let orderByColumn = 'posted_date';
    let orderByDirection = 'desc';
    
    switch (sort) {
      case 'price-asc':
        orderByColumn = 'price';
        orderByDirection = 'asc';
        break;
      case 'price-desc':
        orderByColumn = 'price';
        orderByDirection = 'desc';
        break;
      case 'mileage-asc':
        orderByColumn = 'mileage';
        orderByDirection = 'asc';
        break;
      case 'date':
      default:
        orderByColumn = 'posted_date';
        orderByDirection = 'desc';
        break;
    }

    // Apply sorting - Supabase order() method
    query = query.order(orderByColumn, { ascending: orderByDirection === 'asc' });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: listings, error, count } = await query;

    if (error) {
      throw error;
    }

    // Batch fetch sources for all listings (same car on multiple scrapers)
    const listingIds = (listings || []).map((l) => l.id);
    let sourcesByListing = new Map();
    if (listingIds.length > 0) {
      try {
        const { data: sourcesRows } = await supabase
          .from('listing_sources')
          .select('listing_id, source_platform, url')
          .in('listing_id', listingIds);
        if (sourcesRows) {
          for (const r of sourcesRows) {
            if (!sourcesByListing.has(r.listing_id)) {
              sourcesByListing.set(r.listing_id, []);
            }
            sourcesByListing.get(r.listing_id).push({ platform: r.source_platform, url: r.url });
          }
        }
      } catch {
        // listing_sources table may not exist
      }
    }

    // Optimize: Batch market price calculations for better performance
    // Only calculate market price for premium users (pro or plus plans)
    const isPremium = userPlan === 'pro' || userPlan === 'plus';
    const marketPriceCache = new Map();

    const enrichedListings = await Promise.all(
      (listings || []).map(async (listing) => {
        const sources = sourcesByListing.get(listing.id) || [];
        const base = { ...listing, sources };
        if (isPremium) {
          try {
            // Create cache key to avoid duplicate calculations
            const cacheKey = `${listing.brand}-${listing.model}-${listing.year}-${listing.location_country || 'FR'}`;

            if (!marketPriceCache.has(cacheKey)) {
              const marketPrice = await calculateMarketPrice({
                brand: listing.brand,
                model: listing.model,
                year: listing.year,
                mileage: listing.mileage,
                country: listing.location_country || listing.country || 'FR',
                fuel_type: listing.fuel_type,
                transmission: listing.transmission
              });
              marketPriceCache.set(cacheKey, marketPrice);
            }

            const marketPrice = marketPriceCache.get(cacheKey);
            return {
              ...base,
              market_price: marketPrice.market_price,
              confidence_index: marketPrice.confidence_index,
              comparables_count: marketPrice.comparables_count
            };
          } catch (error) {
            return base;
          }
        } else {
          return {
            ...base,
            market_price: null,
            confidence_index: null,
            comparables_count: null
          };
        }
      })
    );

    return {
      total: count || 0,
      limit,
      offset,
      listings: enrichedListings
    };
  } catch (error) {
    throw error;
  }
}

export async function getListingByIdService(listingId, userPlan = null) {
  try {
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('status', 'active')
      .single();

    if (error) {
      throw error;
    }

    if (!listing) {
      return null;
    }

    // Fetch all source links (same car on bilweb, autoscout24, etc.)
    let sources = [];
    try {
      sources = await getListingSources(listingId);
    } catch {
      // listing_sources table may not exist if migration not run
    }

    const baseListing = {
      ...listing,
      sources: sources.map((s) => ({
        platform: s.source_platform,
        url: s.url,
        source_listing_id: s.source_listing_id
      }))
    };

    // Only calculate market price for premium users (pro or plus plans)
    const isPremium = userPlan === 'pro' || userPlan === 'plus';

    if (isPremium) {
      try {
        const marketPrice = await calculateMarketPrice({
          brand: listing.brand,
          model: listing.model,
          year: listing.year,
          mileage: listing.mileage,
          country: listing.location_country || listing.country,
          fuel_type: listing.fuel_type,
          transmission: listing.transmission
        });

        return {
          ...baseListing,
          market_price: marketPrice.market_price,
          confidence_index: marketPrice.confidence_index,
          comparables_count: marketPrice.comparables_count
        };
      } catch (error) {
        return baseListing;
      }
    } else {
      return {
        ...baseListing,
        market_price: null,
        confidence_index: null,
        comparables_count: null
      };
    }
  } catch (error) {
    throw error;
  }
}

export async function exportListingsCsvService(filters) {
  const {
    brand,
    model,
    source_platform,
    status,
    country,
    min_price,
    max_price,
    min_year,
    max_year,
    min_mileage,
    max_mileage,
    posted_from,
    posted_to,
    last_seen_from,
    last_seen_to,
    limit = 5000,
    offset = 0
  } = filters;

  const selectColumns = [
    'id',
    'source_platform',
    'source_listing_id',
    'brand',
    'model',
    'year',
    'mileage',
    'price',
    'currency',
    'location_city',
    'location_region',
    'location_country',
    'seller_type',
    'fuel_type',
    'transmission',
    'steering',
    'doors',
    'color',
    'url',
    'status',
    'posted_date',
    'first_seen',
    'last_seen',
    'sold_date',
    'price_drop_amount',
    'price_drop_pct',
    'last_price_drop_date',
    'run_id',
    'created_at',
    'updated_at'
  ].join(', ');

  let query = supabase
    .from('listings')
    .select(selectColumns)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (source_platform) {
    query = query.eq('source_platform', source_platform);
  }

  if (country) {
    query = query.eq('location_country', country);
  }

  if (brand) {
    const brands = Array.isArray(brand) ? brand : [brand];
    query = query.in('brand', brands.map(value => String(value).toLowerCase()));
  }

  if (model) {
    const models = Array.isArray(model) ? model : [model];
    query = query.in('model', models.map(value => String(value).toLowerCase()));
  }

  if (min_price) {
    query = query.gte('price', min_price);
  }

  if (max_price) {
    query = query.lte('price', max_price);
  }

  if (min_year) {
    query = query.gte('year', min_year);
  }

  if (max_year) {
    query = query.lte('year', max_year);
  }

  if (min_mileage) {
    query = query.gte('mileage', min_mileage);
  }

  if (max_mileage) {
    query = query.lte('mileage', max_mileage);
  }

  if (posted_from) {
    query = query.gte('posted_date', posted_from);
  }

  if (posted_to) {
    query = query.lte('posted_date', posted_to);
  }

  if (last_seen_from) {
    query = query.gte('last_seen', last_seen_from);
  }

  if (last_seen_to) {
    query = query.lte('last_seen', last_seen_to);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return { listings: data || [] };
}
