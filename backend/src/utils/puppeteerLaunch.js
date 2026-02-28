/**
 * Centralized Puppeteer launch helper.
 * On VPS/Linux, set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser to use
 * system Chromium (avoids "libglib-2.0.so.0: cannot open shared object file" from bundled Chromium).
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const DEFAULT_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process',
];

/**
 * Launch browser. Uses system Chromium when PUPPETEER_EXECUTABLE_PATH is set (recommended on VPS).
 * @param {Object} [options] - Merged with launch options
 * @returns {Promise<import('puppeteer').Browser>}
 */
export async function launchBrowser(options = {}) {
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const opts = {
    headless: true,
    args: options.args || DEFAULT_ARGS,
    ...options,
  };
  opts.args = opts.args || DEFAULT_ARGS;

  if (execPath) {
    opts.executablePath = execPath;
  }
  return puppeteer.launch(opts);
}

export { puppeteer };
