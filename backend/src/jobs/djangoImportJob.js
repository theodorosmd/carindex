import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { upsertListingsBatch } from '../services/ingestService.js';

const DEFAULT_CRON = '0 3 * * *';
const DEFAULT_PAGE_LIMIT = 1000;  // 1000 cars/page pour débit Oleg (~300k LBC, ~1M mobile.de en quelques heures)

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isNaN(num) ? null : num;
}

function parseMileage(value) {
  if (!value) return null;
  const raw = String(value).toLowerCase();
  const num = parseNumber(raw);
  if (num === null) return null;
  if (raw.includes('mil')) {
    // Swedish "mil" = 10 km
    return Math.round(num * 10);
  }
  return Math.round(num);
}

function parseYearFromTitle(title) {
  const match = String(title || '').match(/\b(19|20)\d{2}\b/);
  if (!match) return null;
  const year = parseInt(match[0], 10);
  return Number.isNaN(year) ? null : year;
}

function inferBrandModel(title, fallbackBrand = null, fallbackModel = null) {
  if (fallbackBrand && fallbackModel) {
    return { brand: fallbackBrand, model: fallbackModel };
  }

  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    return { brand: fallbackBrand, model: fallbackModel };
  }

  const parts = cleanTitle.split(/\s+/);
  const brand = fallbackBrand || (parts[0] ? parts[0] : null);
  const model = fallbackModel || (parts[1] ? parts[1] : null);
  return { brand, model };
}

function countryForSource(source) {
  if (!source) return null;
  const normalized = String(source).toLowerCase();
  if (['bytbil', 'blocket', 'bilweb'].includes(normalized)) return 'SE';
  if (['leboncoin'].includes(normalized)) return 'FR';
  if (['mobile.de', 'mobile_de'].includes(normalized)) return 'DE';
  return null;
}

function countryFromText(text) {
  if (!text) return null;
  const normalized = String(text).toUpperCase();
  const match = normalized.match(/\b([A-Z]{2})[-\s]/);
  if (match?.[1]) return match[1];
  return null;
}

const COUNTRY_NAME_TO_CODE = {
  sweden: 'SE', sverige: 'SE', se: 'SE',
  france: 'FR', fr: 'FR',
  germany: 'DE', deutschland: 'DE', de: 'DE',
  norway: 'NO', norge: 'NO', no: 'NO',
  denmark: 'DK', danmark: 'DK', dk: 'DK',
  finland: 'FI', finlande: 'FI', fi: 'FI'
};

function normalizeCountryCode(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (s.length === 2) return s.toUpperCase();
  if (s.length > 2) {
    const lower = s.toLowerCase();
    const mapped = COUNTRY_NAME_TO_CODE[lower];
    if (mapped) return mapped;
  }
  return null;
}

function parseYearFromRegistration(value) {
  if (!value) return null;
  const match = String(value).match(/\b(19|20)\d{2}\b/);
  if (!match) return null;
  const year = parseInt(match[0], 10);
  return Number.isNaN(year) ? null : year;
}

function currencyForSource(source, priceValue) {
  if (priceValue && String(priceValue).toLowerCase().includes('kr')) return 'SEK';
  const normalized = String(source || '').toLowerCase();
  if (['bytbil', 'blocket', 'bilweb'].includes(normalized)) return 'SEK';
  if (['leboncoin', 'autoscout24', 'mobile.de'].includes(normalized)) return 'EUR';
  return null;
}

function buildUrlFromSource(source, sourceId) {
  if (!source || !sourceId) return null;
  const normalized = String(source).toLowerCase();
  // Avoid guessing URLs when we don't know the exact format.
  if (['blocket', 'bilweb', 'bytbil'].includes(normalized)) {
    return null;
  }
  return null;
}

export function mapDjangoCarToListing(car, options = {}) {
  const source = options.sourceOverride || car?.source || null;
  const sourceId = car?.source_id || car?.id || null;
  const title = car?.title || '';
  const inferred = inferBrandModel(title, car?.brand || car?.make, car?.model);
  const url = car?.url || car?.source_url || car?.link || buildUrlFromSource(source, sourceId);
  const price = parseNumber(car?.price_amount ?? car?.price);
  const yearFromTitle = parseYearFromTitle(title);
  const yearFromRegistration = parseYearFromRegistration(car?.first_registration);
  const rawYear = parseNumber(car?.year) || parseNumber(car?.model_year) || yearFromRegistration || yearFromTitle;
  const resolvedYear = rawYear && rawYear >= 1950 && rawYear <= 2100 ? rawYear : null;
  const yearUnknown = !resolvedYear;
  const mileageValue = parseMileage(car?.mileage);
  const mileageUnknown = mileageValue === null;
  const primaryImage = car?.img_link || car?.image || null;
  const apiImages = Array.isArray(car?.images) ? car.images.filter(Boolean) : [];
  const images = apiImages.length > 0
    ? apiImages
    : primaryImage
      ? [primaryImage]
      : [];

  return {
    source_platform: source,
    source_listing_id: sourceId ? String(sourceId) : null,
    brand: inferred.brand ? String(inferred.brand).toLowerCase() : null,
    model: inferred.model ? String(inferred.model).toLowerCase() : null,
    year: resolvedYear || 2000,
    price,
    currency: car?.currency || currencyForSource(source, car?.price ?? car?.price_amount),
    mileage: mileageValue ?? 0,
    url,
    location_country: normalizeCountryCode(
      countryFromText(car?.dealer_address) || car?.country || countryForSource(source)
    ) || countryForSource(source) || 'FR',
    posted_date: car?.first_seen_at || null,
    first_seen: car?.first_seen_at || null,
    last_seen: car?.last_seen_at || null,
    status: car?.sold ? 'sold' : 'active',
    images,
    specifications: {
      features: Array.isArray(car?.features) ? car.features : [],
      dealer_phones: Array.isArray(car?.dealer_phones) ? car.dealer_phones : [],
      hu_until_date: car?.hu_until_date || null,
      hu_until_raw: car?.hu_until_raw || null,
      reg_number: car?.reg_number || null,
      status_code: car?.status_code || null,
      year_unknown: yearUnknown,
      mileage_unknown: mileageUnknown
    },
    description: title
  };
}

function buildCookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function mergeSetCookies(cookies, setCookieHeaders) {
  if (!setCookieHeaders || setCookieHeaders.length === 0) return cookies;
  const nextCookies = { ...cookies };
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    const [key, value] = pair.split('=');
    if (key && value) {
      nextCookies[key.trim()] = value.trim();
    }
  }
  return nextCookies;
}

const FETCH_TIMEOUT_MS = parseInt(process.env.DJANGO_FETCH_TIMEOUT_MS || '60000', 10);
const RETRY_MAX = parseInt(process.env.DJANGO_FETCH_RETRY_MAX || '5', 10);
const RETRY_BASE_DELAY_MS = parseInt(process.env.DJANGO_FETCH_RETRY_DELAY_MS || '5000', 10);

export async function fetchWithCookies(url, options = {}, cookies = {}) {
  const headers = {
    ...(options.headers || {}),
    Cookie: buildCookieHeader(cookies)
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { ...options, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  const setCookieHeaders = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : response.headers.get('set-cookie')
      ? [response.headers.get('set-cookie')]
      : [];
  const nextCookies = mergeSetCookies(cookies, setCookieHeaders);
  return { response, cookies: nextCookies };
}

export async function loginDjango(overrides = {}) {
  const baseUrl = overrides.baseUrl || process.env.DJANGO_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('DJANGO_API_BASE_URL or baseUrl override required. Set in .env (see .env.example).');
  }
  const username = overrides.username || process.env.DJANGO_API_USERNAME;
  const password = overrides.password || process.env.DJANGO_API_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing DJANGO_API_USERNAME or DJANGO_API_PASSWORD (or overrides)');
  }

  let cookies = {};
  const loginUrl = `${baseUrl}/admin/login/?next=/admin/`;

  const loginPage = await fetchWithCookies(loginUrl, {}, cookies);
  cookies = loginPage.cookies;
  const html = await loginPage.response.text();
  const match = html.match(/name="csrfmiddlewaretoken" value="([^"]+)"/);
  const csrfToken = match ? match[1] : null;

  if (!csrfToken) {
    throw new Error('Failed to extract CSRF token from Django login');
  }

  const body = new URLSearchParams({
    csrfmiddlewaretoken: csrfToken,
    username,
    password,
    next: '/admin/'
  });

  const loginResult = await fetchWithCookies(`${baseUrl}/admin/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: loginUrl
    },
    redirect: 'manual',
    body: body.toString()
  }, cookies);

  cookies = loginResult.cookies;

  const hasSession = Boolean(cookies.sessionid);

  if (loginResult.response.status !== 302 && !hasSession) {
    throw new Error(`Django login failed with status ${loginResult.response.status}`);
  }

  // Verify access to API with session cookie
  const apiPath = overrides.apiPath || 'api/cars';
  const testResponse = await fetchWithCookies(`${baseUrl}/${apiPath}/?limit=1`, {}, cookies);
  if (testResponse.response.status === 403 || testResponse.response.status === 401) {
    throw new Error(`Django API auth failed with status ${testResponse.response.status}`);
  }

  return cookies;
}

export async function runDjangoImportOnce(overrides = {}) {
  const baseUrl = overrides.baseUrl || process.env.DJANGO_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('DJANGO_API_BASE_URL or baseUrl override required. Set in .env (see .env.example).');
  }
  const apiPath = overrides.apiPath || 'api/cars';
  const pageLimit = parseInt(process.env.DJANGO_API_PAGE_LIMIT || DEFAULT_PAGE_LIMIT, 10);
  const maxPages = parseInt(process.env.DJANGO_API_MAX_PAGES || '0', 10);
  const startPage = parseInt(overrides.startPage || process.env.DJANGO_IMPORT_START_PAGE || '1', 10);
  const extraQuery = overrides.extraQuery || process.env.DJANGO_API_CARS_QUERY || '';
  const sourceOverride = overrides.sourceOverride || null;

  logger.info('Starting Django API import', {
    baseUrl,
    apiPath,
    pageLimit,
    maxPages: maxPages || 'all',
    startPage: startPage > 1 ? startPage : undefined
  });

  const cookies = await loginDjango(overrides);

  // Build URL: support filtering by source (e.g. source=mobile_de) or status (e.g. status=OK)
  // via DJANGO_API_CARS_QUERY="source=mobile_de" or "status=OK"
  let nextUrl = `${baseUrl}/${apiPath}/?limit=${pageLimit}`;
  if (startPage > 1) {
    // DRF: LimitOffsetPagination uses offset, PageNumberPagination uses page
    const usePageParam = overrides.usePageParam ?? /^1|true$/i.test(process.env.DJANGO_IMPORT_USE_PAGE_PARAM || '');
    if (usePageParam) {
      nextUrl += `&page=${startPage}`;
    } else {
      nextUrl += `&offset=${(startPage - 1) * 10}`;
    }
  }
  if (extraQuery) {
    const q = extraQuery.replace(/^\?/, '');
    nextUrl += (nextUrl.includes('?') ? '&' : '?') + q;
  }

  let page = startPage - 1;
  let totalImported = 0;
  let totalCount = null;
  let totalPages = null;

  while (nextUrl) {
    page += 1;
    if (maxPages > 0 && page > maxPages) break;

    let lastError = null;
    let success = false;

    for (let attempt = 1; attempt <= RETRY_MAX; attempt += 1) {
      try {
        const { response } = await fetchWithCookies(nextUrl, {}, cookies);
        if (response.status === 401 || response.status === 403) {
          logger.warn('Session expired, re-logging in', { page, attempt });
          cookies = await loginDjango(overrides);
          continue;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch cars page ${page}: ${response.status}`);
        }

        const payload = await response.json();
        const cars = payload?.results || [];
        const mapOpts = sourceOverride ? { sourceOverride } : {};
        const listings = cars.map((c) => mapDjangoCarToListing(c, mapOpts));

        if (totalCount == null && payload?.count != null) {
          totalCount = payload.count;
          const pageSize = cars.length || 10;
          totalPages = Math.ceil(totalCount / pageSize);
          logger.info('Django API total', { totalCount, totalPages, pageSize });
        }

        const result = await upsertListingsBatch(listings, {
          allowMissingRequired: true,
          useBulkUpsert: true
        });
        totalImported += (result.created + result.updated);

        const logPayload = {
          page,
          fetched: cars.length,
          created: result.created,
          updated: result.updated,
          errors: result.errors
        };
        if (totalPages != null) {
          logPayload.progress = `${((page / totalPages) * 100).toFixed(1)}%`;
        }
        logger.info('Imported Django cars page', logPayload);

        if (result.errors > 0) {
          const sampleErrors = (result.items || []).filter(item => item.status === 'error').slice(0, 3);
          logger.warn('Sample import errors', { page, sampleErrors });
        }

        nextUrl = payload?.next || null;
        success = true;
        break;
      } catch (err) {
        lastError = err;
        const isRetryable =
          err.message?.includes('fetch failed') ||
          err.name === 'AbortError' ||
          err.message?.includes('ECONNRESET') ||
          err.message?.includes('ETIMEDOUT') ||
          err.message?.includes('network');

        if (!isRetryable || attempt >= RETRY_MAX) {
          throw err;
        }

        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn('Fetch failed, retrying', {
          page,
          attempt,
          maxRetries: RETRY_MAX,
          delayMs,
          error: err.message
        });
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (!success) {
      throw lastError;
    }
  }

  logger.info('Django API import completed', { totalImported });
}

export function startDjangoImportJob() {
  const cronExpression = process.env.DJANGO_IMPORT_CRON || DEFAULT_CRON;
  logger.info('Starting Django import job', { cronExpression });

  cron.schedule(cronExpression, async () => {
    try {
      await runDjangoImportOnce();
    } catch (error) {
      logger.error('Error in scheduled Django import', { error: error.message });
    }
  });

  if (process.env.RUN_DJANGO_IMPORT_ON_STARTUP === 'true') {
    setTimeout(async () => {
      try {
        await runDjangoImportOnce();
      } catch (error) {
        logger.error('Error in initial Django import', { error: error.message });
      }
    }, 5000);
  }
}

const LEBONCOIN_DEFAULT_CRON = '0 4 * * *'; // 4 AM (after main Django import at 3 AM)

export async function runDjangoMobileDeImportOnce() {
  const baseUrl = process.env.DJANGO_MOBILEDE_BASE_URL;
  if (!baseUrl) {
    throw new Error('DJANGO_MOBILEDE_BASE_URL required. Set in .env (see .env.example).');
  }
  const username = process.env.DJANGO_MOBILEDE_USERNAME || process.env.DJANGO_API_USERNAME;
  const password = process.env.DJANGO_MOBILEDE_PASSWORD || process.env.DJANGO_API_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing DJANGO_MOBILEDE_USERNAME/PASSWORD or DJANGO_API_USERNAME/PASSWORD');
  }

  const overrides = {
    baseUrl,
    username,
    password,
    apiPath: process.env.DJANGO_MOBILEDE_API_PATH || 'api/cars',
    extraQuery: process.env.DJANGO_API_CARS_QUERY || '',
    ...(process.env.DJANGO_IMPORT_START_PAGE && { startPage: parseInt(process.env.DJANGO_IMPORT_START_PAGE, 10) }),
    ...(process.env.DJANGO_IMPORT_USE_PAGE_PARAM && { usePageParam: true })
  };

  return runDjangoImportOnce(overrides);
}

export function startDjangoMobileDeImportJob() {
  const cronExpression = process.env.DJANGO_MOBILEDE_IMPORT_CRON || process.env.DJANGO_IMPORT_CRON || '0 */2 * * *'; // toutes les 2h par défaut
  logger.info('Starting Django mobile.de import job (Oleg)', { cronExpression });

  cron.schedule(cronExpression, async () => {
    logger.info('Running scheduled Django mobile.de import...');
    try {
      await runDjangoMobileDeImportOnce();
    } catch (error) {
      logger.error('Error in scheduled Django mobile.de import', { error: error.message });
    }
  });

  if (process.env.RUN_DJANGO_IMPORT_ON_STARTUP === 'true') {
    setTimeout(async () => {
      try {
        await runDjangoMobileDeImportOnce();
      } catch (error) {
        logger.error('Error in initial Django mobile.de import', { error: error.message });
      }
    }, 5000);
  }
}

export async function runDjangoLeboncoinImportOnce() {
  const baseUrl = process.env.DJANGO_LEBONCOIN_BASE_URL;
  if (!baseUrl) {
    throw new Error('DJANGO_LEBONCOIN_BASE_URL required. Set in .env (see .env.example).');
  }
  const username = process.env.DJANGO_LEBONCOIN_USERNAME || process.env.DJANGO_API_USERNAME;
  const password = process.env.DJANGO_LEBONCOIN_PASSWORD || process.env.DJANGO_API_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing DJANGO_LEBONCOIN_USERNAME/PASSWORD or DJANGO_API_USERNAME/PASSWORD');
  }

  const overrides = {
    baseUrl,
    username,
    password,
    apiPath: process.env.DJANGO_LEBONCOIN_API_PATH || 'api/cars',
    sourceOverride: 'leboncoin'
  };

  return runDjangoImportOnce(overrides);
}

export function startDjangoLeboncoinImportJob() {
  const cronExpression = process.env.DJANGO_LEBONCOIN_IMPORT_CRON || LEBONCOIN_DEFAULT_CRON;
  logger.info('Starting Django Leboncoin import job (Oleg)', { cronExpression });

  cron.schedule(cronExpression, async () => {
    logger.info('Running scheduled Django Leboncoin import...');
    try {
      await runDjangoLeboncoinImportOnce();
    } catch (error) {
      logger.error('Error in scheduled Django Leboncoin import', { error: error.message });
    }
  });

  if (process.env.RUN_DJANGO_IMPORT_ON_STARTUP === 'true') {
    setTimeout(async () => {
      try {
        await runDjangoLeboncoinImportOnce();
      } catch (error) {
        logger.error('Error in initial Django Leboncoin import', { error: error.message });
      }
    }, 10000); // 10s après mobile.de (5s) pour éviter surcharge
  }
}
