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
    // Cold-launching Chromium on a free-tier shared-CPU host can take well over the request's
    // own timeout budget, so per-request launches were never going to be reliable there. min: 1
    // launches the one allowed browser once, in the background, as soon as this module loads
    // (generic-pool's autostart) — not blocking Express from listening — and keeps it alive
    // forever instead of tearing it down between requests. Every request after that just
    // borrows the already-running instance.
    min: parseInt(process.env.BROWSER_POOL_MIN, 10) || 1,
    idleTimeoutMillis: 90000,
    // Safety margin in case the pool's one browser dies (crash/OOM) and has to relaunch
    // mid-request instead of being handed out already-warm.
    acquireTimeoutMillis: 40000,
    testOnBorrow: true           // Validate browser before returning from pool
  }
);

// The min:1 warmup launch happens outside any request, so a failure here (e.g. missing
// system libs for Chromium on this host) would otherwise disappear silently instead of
// showing up as the "ResourceRequest timed out" a user sees later.
pool.on('factoryCreateError', (err) => {
  console.error('[BrowserPool] Background browser launch failed:', err.message);
});

module.exports = pool;
