/**
 * Centralized Puppeteer launch helper.
 * On VPS/Linux, uses system Chromium by default (avoids libglib errors from bundled Chrome).
 */
import { execSync } from 'node:child_process';
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

/** On Linux, prefer system Chromium to avoid libglib errors from bundled Chrome */
function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === 'linux') {
    try {
      return execSync('which chromium-browser 2>/dev/null || which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Launch browser. Uses system Chromium when PUPPETEER_EXECUTABLE_PATH is set or on Linux (avoids libglib errors).
 * @param {Object} [options] - Merged with launch options
 * @returns {Promise<import('puppeteer').Browser>}
 */
export async function launchBrowser(options = {}) {
  const execPath = getExecutablePath();
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
