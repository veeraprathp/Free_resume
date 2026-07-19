const { join } = require('path');

/**
 * Pins Puppeteer's Chromium download to a path inside the project directory.
 * Render's build and run phases don't reliably agree on what $HOME resolves
 * to, so the default cache dir ($HOME/.cache/puppeteer) downloads fine during
 * the build but is unreachable at runtime ("Could not find Chrome ... cache
 * path is incorrectly configured"). Anchoring to __dirname makes install-time
 * and run-time use the same location regardless of $HOME.
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
