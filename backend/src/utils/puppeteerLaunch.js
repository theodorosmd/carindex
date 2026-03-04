/**
 * Centralized Puppeteer launch helper.
 * On VPS/Linux, uses system Chromium by default (avoids libglib errors from bundled Chrome).
 */
import { existsSync } from 'node:fs';

// Force system Chromium on Linux if not set (fallback when .env/ecosystem env not loaded yet)
if (process.platform === 'linux' && !process.env.PUPPETEER_EXECUTABLE_PATH) {
  if (existsSync('/usr/bin/chromium-browser')) {
    process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
  } else if (existsSync('/usr/bin/chromium')) {
    process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium';
  }
}
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

const LINUX_CHROMIUM_PATHS = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',  // Ubuntu 24.04 (snap)
];

/** On Linux, prefer system Chromium to avoid libglib errors from bundled Chrome */
function getExecutablePath() {
  // 1. Env var (from .env or ecosystem)
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && envPath.trim()) {
    return envPath.trim();
  }
  // 2. On Linux: detect system Chromium (critical - bundled Chrome fails with libglib)
  if (process.platform === 'linux') {
    for (const p of LINUX_CHROMIUM_PATHS) {
      if (existsSync(p)) return p;
    }
    try {
      const out = execSync('which chromium-browser 2>/dev/null || which chromium 2>/dev/null', { encoding: 'utf8', env: { PATH: '/usr/bin:/usr/local/bin:' + (process.env.PATH || '') } }).trim();
      if (out) return out;
    } catch {
      /* ignore */
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
