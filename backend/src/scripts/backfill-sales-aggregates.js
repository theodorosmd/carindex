/**
 * Backfill sales_aggregates from existing sold listings
 * Groups by: brand, model, fuel_type, trim, engine, location_country
 * Only countries: FR, DE, NO, FI, DK, NL, BE, LU, ES, IT, CH, PL
 * Run once after migration 032 to populate from historical data
 */
import { supabase } from '../config/supabase.js';
import { toEUR, AGGREGATE_COUNTRIES } from '../config/aggregateCountries.js';

function norm(s) {
  return String(s ?? '').trim().toLowerCase().slice(0, 255) || '';
}

function buildEngineKey(version, displacement, powerHp) {
  const v = norm(version);
  if (v) return v;
  const d = displacement != null ? String(displacement).replace('.', '') : '0';
  const p = powerHp != null ? String(powerHp) : '0';
  return `${d}_${p}`;
}

function buildKey(row) {
  const country = (row.location_country || '').toString().toUpperCase().slice(0, 2);
  return [norm(row.brand), norm(row.model), norm(row.fuel_type), norm(row.trim), buildEngineKey(row.version, row.displacement, row.power_hp), country].join('|');
}

async function backfill() {
  const { data: sold, error } = await supabase
    .from('listings')
    .select('brand, model, fuel_type, trim, version, displacement, power_hp, location_country, dom_days, price')
    .eq('status', 'sold')
    .in('location_country', AGGREGATE_COUNTRIES)
    .not('dom_days', 'is', null)
    .gte('dom_days', 0);

  if (error) {
    console.error('Error fetching sold listings:', error.message);
    process.exit(1);
  }

  const byKey = new Map();
  for (const row of sold || []) {
    const c = (row.location_country || '').toString().toUpperCase().slice(0, 2);
    if (!c) continue;
    const key = buildKey(row);
    const acc = byKey.get(key) || {
      brand: norm(row.brand),
      model: norm(row.model),
      fuel_type: norm(row.fuel_type),
      trim: norm(row.trim),
      engine: buildEngineKey(row.version, row.displacement, row.power_hp),
      location_country: c,
      total: 0,
      sumDom: 0,
      sumPrice: 0
    };
    acc.total += 1;
    acc.sumDom += row.dom_days || 0;
    acc.sumPrice += toEUR(row.price, c);
    byKey.set(key, acc);
  }

  if (byKey.size === 0) {
    console.log('No sold listings to backfill');
    return;
  }

  for (const [, acc] of byKey) {
    const { error: upsertErr } = await supabase
      .from('sales_aggregates')
      .upsert({
        brand: acc.brand,
        model: acc.model,
        fuel_type: acc.fuel_type,
        trim: acc.trim,
        engine: acc.engine,
        location_country: acc.location_country,
        total_sales: acc.total,
        sum_dom_days: acc.sumDom,
        sum_price_eur: Math.round(acc.sumPrice * 100) / 100,
        last_updated: new Date().toISOString()
      }, { onConflict: 'brand,model,fuel_type,trim,engine,location_country' });

    if (upsertErr) {
      console.error(`Error upserting ${acc.brand} ${acc.model}:`, upsertErr.message);
    } else {
      console.log(`${acc.brand} ${acc.model} (${acc.fuel_type}/${acc.trim}/${acc.engine}) ${acc.location_country}: ${acc.total} ventes`);
    }
  }
  console.log(`Backfill done. ${byKey.size} agrégats créés.`);
}

backfill();
