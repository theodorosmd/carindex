import { supabase } from '../config/supabase.js';

export async function getTrendsService({ brand, model, country, months = 12, year }) {
  const monthsInt = parseInt(months) || 12;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsInt);
  const cutoffISO = cutoff.toISOString();

  // Helper to apply common brand/model/country/year filters
  const applyFilters = (query) => {
    query = query.ilike('brand', brand).ilike('model', model);
    if (country && country !== 'ALL') query = query.eq('location_country', country.toUpperCase());
    if (year) query = query.eq('year', parseInt(year));
    return query;
  };

  // Query 1: monthly average price — all listings posted in the period
  let priceQuery = supabase
    .from('listings')
    .select('posted_date, price_eur')
    .gte('posted_date', cutoffISO)
    .not('price_eur', 'is', null)
    .gt('price_eur', 0)
    .lt('price_eur', 500000)
    .limit(15000);
  priceQuery = applyFilters(priceQuery);

  // Query 2: monthly average DOM — sold listings in the period
  let domQuery = supabase
    .from('listings')
    .select('sold_date, dom_days')
    .eq('status', 'sold')
    .gte('sold_date', cutoffISO)
    .not('dom_days', 'is', null)
    .gt('dom_days', 0)
    .lt('dom_days', 365)
    .limit(5000);
  domQuery = applyFilters(domQuery);

  const [{ data: priceRows }, { data: domRows }] = await Promise.all([priceQuery, domQuery]);

  // Aggregate by YYYY-MM
  const priceByMonth = new Map();
  for (const row of priceRows || []) {
    if (!row.posted_date) continue;
    const month = row.posted_date.slice(0, 7);
    if (!priceByMonth.has(month)) priceByMonth.set(month, []);
    priceByMonth.get(month).push(row.price_eur);
  }

  const domByMonth = new Map();
  for (const row of domRows || []) {
    if (!row.sold_date) continue;
    const month = row.sold_date.slice(0, 7);
    if (!domByMonth.has(month)) domByMonth.set(month, []);
    domByMonth.get(month).push(row.dom_days);
  }

  // Merge both month sets and sort chronologically
  const allMonths = new Set([...priceByMonth.keys(), ...domByMonth.keys()]);
  const sortedMonths = Array.from(allMonths).sort();

  if (sortedMonths.length === 0) {
    return { brand, model, country, months: monthsInt, trends: [], trendDirection: null };
  }

  const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  const trends = sortedMonths.map(month => ({
    month,
    averagePrice: priceByMonth.has(month) ? avg(priceByMonth.get(month)) : null,
    averageDOM:   domByMonth.has(month)   ? avg(domByMonth.get(month))   : null,
    listingCount: priceByMonth.get(month)?.length || 0
  }));

  // Trend direction: compare first vs last data point for price and DOM
  const withPrice = trends.filter(t => t.averagePrice !== null);
  const withDOM   = trends.filter(t => t.averageDOM   !== null);

  const firstPrice = withPrice[0]?.averagePrice;
  const lastPrice  = withPrice[withPrice.length - 1]?.averagePrice;
  const priceChange    = (firstPrice && lastPrice) ? Math.round(lastPrice - firstPrice) : 0;
  const priceChangePct = firstPrice ? Math.round((priceChange / firstPrice) * 100 * 10) / 10 : 0;

  const firstDOM  = withDOM[0]?.averageDOM;
  const lastDOM   = withDOM[withDOM.length - 1]?.averageDOM;
  const domChange = (firstDOM && lastDOM) ? Math.round(lastDOM - firstDOM) : 0;

  const direction = (v) => v > 0 ? 'up' : v < 0 ? 'down' : 'stable';

  const trendDirection = trends.length > 1 ? {
    price:        direction(priceChange),
    priceChange,
    priceChangePct,
    dom:          direction(domChange),
    domChange
  } : null;

  return { brand, model, country, months: monthsInt, trends, trendDirection };
}
