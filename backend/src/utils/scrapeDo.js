import { logger } from './logger.js';

const SCRAPE_DO_BASE = 'https://api.scrape.do';

function getToken() {
  return process.env.SCRAPE_DO_TOKEN || null;
}

/**
 * Fetch a page via scrape.do proxy API.
 * Handles anti-bot bypass (Datadome, Cloudflare, etc.), CAPTCHA solving, and proxy rotation.
 *
 * @param {string} targetUrl - URL to fetch
 * @param {Object} options
 * @param {boolean} options.render - Use headless browser for JS rendering (costs more credits)
 * @param {number} options.customWait - Wait time in ms after page load (only with render=true)
 * @param {string} options.geoCode - Country code for geo-targeting (e.g., 'fr', 'se', 'de')
 * @param {boolean} options.super - Use residential/mobile proxies (better for protected sites)
 * @param {number} options.retries - Number of retry attempts on transient errors
 * @returns {Promise<string>} HTML content
 */
export async function fetchViaScrapeDo(targetUrl, {
  render = false,
  customWait = 5000,
  geoCode = null,
  superProxy = true,
  retries = 2,
  timeout = 90000,
} = {}) {
  const token = getToken();
  if (!token) throw new Error('SCRAPE_DO_TOKEN not set — sign up at https://scrape.do');

  const params = new URLSearchParams({
    token,
    url: targetUrl,
    render: String(render),
    super: String(superProxy),
    device: 'desktop',
    timeout: String(timeout),
  });

  if (geoCode) params.set('geoCode', geoCode);
  if (render) {
    params.set('customWait', String(customWait));
    params.set('blockResources', 'false');
  }

  const apiUrl = `${SCRAPE_DO_BASE}/?${params}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(apiUrl, { headers: { Accept: 'text/html' } });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        if (attempt < retries && [429, 502, 503, 504].includes(resp.status)) {
          const waitMs = resp.status === 429 ? 15000 * attempt : 5000 * attempt;
          logger.warn('scrape.do transient error, retrying', { status: resp.status, attempt, waitMs, url: targetUrl });
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw new Error(`scrape.do ${resp.status}: ${body.substring(0, 200)}`);
      }

      return await resp.text();
    } catch (err) {
      if (attempt < retries && (err.message.includes('502') || err.message.includes('ECONNRESET'))) {
        logger.warn('scrape.do fetch error, retrying', { attempt, error: err.message });
        await new Promise(r => setTimeout(r, 5000 * attempt));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Check if scrape.do is configured (token present in env).
 */
export function isScrapeDoAvailable() {
  return !!getToken();
}

/**
 * Detect if a Puppeteer page is blocked by anti-bot protection.
 * Checks for common block indicators: status 403, captcha iframes, empty body, known block pages.
 *
 * @param {import('puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
export async function isPageBlocked(page) {
  try {
    const result = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      const title = document.title || '';

      if (body.length < 100 && title.length < 30) return 'empty';

      const blockIndicators = [
        'access denied', 'accès temporairement restreint', 'just a moment',
        'checking your browser', 'captcha', 'challenge', 'blocked',
        'please verify you are a human', 'ray id', 'attention required',
      ];
      const lower = (body + ' ' + title).toLowerCase();
      for (const indicator of blockIndicators) {
        if (lower.includes(indicator)) return indicator;
      }

      const captchaFrames = document.querySelectorAll('iframe[src*="captcha"], iframe[src*="datadome"], iframe[src*="challenge"]');
      if (captchaFrames.length > 0) return 'captcha-iframe';

      return false;
    });

    if (result) {
      logger.warn('Anti-bot block detected', { indicator: result, url: page.url() });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
