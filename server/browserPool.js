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
      const args = ['--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions', '--no-first-run'];
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
    max: parseInt(process.env.BROWSER_POOL_MAX, 10) || 3, // Concurrent Chromium instances — set to 1 on hosts with <1GB RAM
    min: 0,                      // Don't keep idle browsers
    idleTimeoutMillis: 30000,    // Close idle browsers after 30 seconds
    acquireTimeoutMillis: 15000, // Wait max 15 seconds for a browser
    testOnBorrow: true           // Validate browser before returning from pool
  }
);

module.exports = pool;
