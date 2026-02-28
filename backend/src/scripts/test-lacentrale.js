/**
 * Quick smoke test for La Centrale scraper logic.
 * Tests parsing (__PRELOADED_STATE__, HTML fallback, detail page) and data mapping.
 * No external dependencies needed (no scrape.do, no Supabase).
 */

import { mapLaCentraleDataToListing } from '../services/laCentraleService.js';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ─── Test 1: mapLaCentraleDataToListing with __PRELOADED_STATE__-style data ───

console.log('\n── Test 1: Mapping from __PRELOADED_STATE__ JSON data ──');
{
  const item = {
    url: 'https://www.lacentrale.fr/auto-occasion-annonce-87123456.html',
    id: 'W123456',
    brand: 'RENAULT',
    model: 'CLIO',
    commercialName: 'Clio V',
    version: 'Intens TCe 100',
    year: 2021,
    mileage: 45000,
    price: 14500,
    fuelType: 'Essence',
    transmission: 'Manuelle',
    powerDIN: 100,
    fiscalPower: 5,
    color: 'Blanc',
    doors: 5,
    customerType: 'PRO',
    locationCity: 'Lyon',
    locationZipcode: '69001',
    locationRegion: 'Auvergne-Rhône-Alpes',
    locationLat: 45.767,
    locationLng: 4.834,
    photoUrl: 'https://images.lacentrale.fr/photo1.jpg',
    category: 'Citadine',
  };

  const listing = mapLaCentraleDataToListing(item);

  assert(listing.source_platform === 'lacentrale', 'source_platform = lacentrale');
  assert(listing.source_listing_id === 'W123456', 'source_listing_id from reference');
  assert(listing.brand === 'renault', 'brand normalized to lowercase');
  assert(listing.model === 'clio', 'model normalized to lowercase');
  assert(listing.year === 2021, 'year = 2021');
  assert(listing.mileage === 45000, 'mileage = 45000');
  assert(listing.price === 14500, 'price = 14500');
  assert(listing.currency === 'EUR', 'currency = EUR');
  assert(listing.fuel_type === 'petrol', 'fuel_type mapped: Essence → petrol');
  assert(listing.transmission === 'manual', 'transmission mapped: Manuelle → manual');
  assert(listing.power_hp === 100, 'power_hp = 100 (powerDIN)');
  assert(listing.color === 'Blanc', 'color = Blanc');
  assert(listing.doors === 5, 'doors = 5');
  assert(listing.seller_type === 'professional', 'seller_type: PRO → professional');
  assert(listing.location_city === 'Lyon', 'location_city = Lyon');
  assert(listing.location_region === 'Auvergne-Rhône-Alpes', 'location_region from data');
  assert(listing.location_country === 'FR', 'location_country = FR');
  assert(listing.steering === 'LHD', 'steering = LHD (France)');
  assert(listing.category === 'hatchback', 'category mapped: Citadine → hatchback');
  assert(listing.location_latitude === 45.767, 'latitude preserved');
  assert(listing.location_longitude === 4.834, 'longitude preserved');
  assert(Array.isArray(listing.images) && listing.images[0].includes('lacentrale'), 'images from photoUrl');
  assert(listing.trim === 'intens', 'trim extracted from version');
}

// ─── Test 2: Mapping with minimal data (HTML fallback scenario) ───

console.log('\n── Test 2: Mapping with minimal/fallback data ──');
{
  const item = {
    url: 'https://www.lacentrale.fr/auto-occasion-annonce-69789012.html',
    id: 'E789012',
    brand: 'BMW',
    model: 'SERIE 3',
    price: '25 990',
    year: '2020',
    mileage: '62 000 km',
  };

  const listing = mapLaCentraleDataToListing(item);

  assert(listing.source_platform === 'lacentrale', 'source_platform = lacentrale');
  assert(listing.source_listing_id === 'E789012', 'source_listing_id from id');
  assert(listing.brand === 'bmw', 'brand = bmw');
  assert(listing.model === 'serie 3', 'model = serie 3');
  assert(listing.price === 25990, 'price parsed from string with spaces');
  assert(listing.year === 2020, 'year parsed from string');
  assert(listing.mileage === 62000, 'mileage parsed from "62 000 km"');
  assert(listing.location_region === 'France', 'location_region defaults to France');
  assert(listing.seller_type === 'private', 'seller_type defaults to private');
}

// ─── Test 3: Mapping with detail page enrichment ───

console.log('\n── Test 3: Mapping with detail page enrichment (fragment_tracking_state) ──');
{
  const item = {
    url: 'https://www.lacentrale.fr/auto-occasion-annonce-66345678.html',
    id: 'B345678',
    brand: 'MERCEDES',
    model: 'CLASSE A',
    year: 2022,
    mileage: 18000,
    price: 32000,
    fuelType: 'Diesel',
    transmission: 'Automatique',
    powerDIN: 150,
    color: 'Noir',
    doors: 5,
    customerType: 'PRIVATE',
    locationCity: 'Paris',
    locationZipcode: '75008',
    category: 'Berline',
    displacement: 2.0,
    version: 'AMG Line 200d',
    images: ['https://img1.lacentrale.fr/a.jpg', 'https://img2.lacentrale.fr/b.jpg'],
    description: 'Mercedes Classe A 200d AMG Line, état neuf, entretien Mercedes.',
  };

  const listing = mapLaCentraleDataToListing(item);

  assert(listing.brand === 'mercedes', 'brand = mercedes');
  assert(listing.model === 'classe a', 'model = classe a');
  assert(listing.fuel_type === 'diesel', 'fuel_type = diesel');
  assert(listing.transmission === 'automatic', 'transmission: Automatique → automatic');
  assert(listing.power_hp === 150, 'power_hp = 150');
  assert(listing.displacement === 2.0, 'displacement = 2.0');
  assert(listing.category === 'sedan', 'category: Berline → sedan');
  assert(listing.seller_type === 'private', 'seller_type: PRIVATE → private');
  assert(listing.location_region === 'Île-de-France', 'region inferred from zipcode 75008');
  assert(listing.images.length === 2, 'images array preserved');
  assert(listing.description.includes('Mercedes'), 'description preserved');
  assert(listing.trim === 'amg line', 'trim: AMG Line extracted');
  assert(listing.color === 'Noir', 'color = Noir');
}

// ─── Test 4: Fuel type mappings ───

console.log('\n── Test 4: Fuel type mappings ──');
{
  const fuels = [
    ['Essence', 'petrol'], ['Diesel', 'diesel'], ['Électrique', 'electric'],
    ['Hybride', 'hybrid'], ['Hybride rechargeable', 'plug-in hybrid'], ['GPL', 'lpg'],
  ];

  for (const [input, expected] of fuels) {
    const listing = mapLaCentraleDataToListing({
      id: `test-fuel-${input}`, brand: 'TEST', model: 'X', price: 1000,
      fuelType: input,
    });
    assert(listing.fuel_type === expected, `${input} → ${expected}`);
  }
}

// ─── Test 5: Category mappings ───

console.log('\n── Test 5: Category mappings ──');
{
  const cats = [
    ['Berline', 'sedan'], ['Break', 'estate'], ['Cabriolet', 'convertible'],
    ['Citadine', 'hatchback'], ['Coupé', 'coupe'], ['Monospace', 'mpv'],
    ['SUV', 'suv'], ['4x4', 'suv'],
  ];

  for (const [input, expected] of cats) {
    const listing = mapLaCentraleDataToListing({
      id: `test-cat-${input}`, brand: 'TEST', model: 'X', price: 1000,
      category: input,
    });
    assert(listing.category === expected, `${input} → ${expected}`);
  }
}

// ─── Test 6: Edge cases ───

console.log('\n── Test 6: Edge cases ──');
{
  const listing = mapLaCentraleDataToListing({
    id: 'edge-1', brand: 'VOLVO', model: 'XC60', price: { amount: 35000 },
    mileage: null, year: null, fuelType: '',
  });
  assert(listing.price === 35000, 'price from object {amount}');
  assert(listing.mileage === 0, 'null mileage → 0');
  assert(listing.year === null, 'null year stays null');
  assert(listing.fuel_type === null, 'empty fuelType → null');

  const listing2 = mapLaCentraleDataToListing({
    id: 'edge-2', brand: 'AUDI', model: 'A4', price: 0,
    locationZipcode: '13001',
  });
  assert(listing2.location_region === "Provence-Alpes-Côte d'Azur", 'region from zipcode 13001 = PACA');
}

// ─── Summary ───

console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
