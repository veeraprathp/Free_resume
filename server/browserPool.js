/**
 * Puppeteer Browser Connection Pool
 * Reuses Chromium instances to reduce memory consumption and cold start times
 */

const puppeteer = require('puppeteer');
const genericPool = require('generic-pool');

// Create a pool of browser instances
const pool = genericPool.createPool(
  {
    create: async () => {
      console.log('[BrowserPool] Creating new browser instance');
      const args = [
        '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions', '--no-first-run',
        // Headless PDF rendering never touches these subsystems — skipping their
        // startup work is the single biggest lever on a cold, CPU-starved launch.
        '--disable-background-networking', '--disable-default-apps', '--disable-sync',
        '--disable-translate', '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding', '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection', '--no-default-browser-check',
        '--metrics-recording-only', '--mute-audio'
      ];
      // Most container hosts (Render/Railway/Fly) run without the privileges Chrome's sandbox needs.
      // Accepts "true"/"1"/"yes" (case-insensitive) since dashboard env vars are easy to set inconsistently.
      if (/^(true|1|yes)$/i.test(process.env.PUPPETEER_NO_SANDBOX || '')) args.push('--no-sandbox');
      const browser = await puppeteer.launch({ headless: 'new', args });
      return browser;
    },
    destroy: async (browser) => {
      console.log('[BrowserPool] Closing browser instance');
      try {
        await browser.close();
      } catch (err) {
        console.error('[BrowserPool] Error closing browser:', err.message);
      }
    },
    validate: async (browser) => {
      try {
        // Check if the browser is still connected
        return browser.isConnected();
      } catch (err) {
        console.error('[BrowserPool] Browser validation failed:', err.message);
        return false;
      }
    }
  },
  {
    // Each Chromium instance holds ~150-250MB RSS. Defaulting to 1 keeps a single free-tier
    // (512MB) host from OOM-killing the whole process under 2+ concurrent PDF requests, which
    // presents as random request timeouts, not an obvious crash. Raise via BROWSER_POOL_MAX
    // once you've confirmed the host has the RAM to spare (e.g. 3 on a 1GB+ plan).
    max: parseInt(process.env.BROWSER_POOL_MAX, 10) || 1,
    min: 0,                      // Don't keep idle browsers
    // With max capped at 1, there's only ever one browser to pay for — worth keeping it
    // around longer to absorb back-to-back downloads (resume PDF, then cover letter PDF)
    // without a repeat cold start.
    idleTimeoutMillis: 90000,
    // Cold-launching Chromium on a shared-CPU container host (Render free/starter tier)
    // regularly takes well over 15s, especially right after the pool sits idle and every
    // browser was reaped. 15s was tight enough to fail on a normal cold start.
    acquireTimeoutMillis: 25000,
    testOnBorrow: true           // Validate browser before returning from pool
  }
);

module.exports = pool;
