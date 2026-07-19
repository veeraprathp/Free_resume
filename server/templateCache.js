/**
 * Compiled Handlebars Template Cache
 * Caches compiled templates in memory to avoid disk I/O and compilation on every request
 */

const { readFile } = require('fs/promises');
const Handlebars = require('handlebars');

// In-memory cache of compiled templates
const cache = new Map();

/**
 * Get compiled template from cache or compile from file
 * @param {string} templatePath - Path to the .hbs template file
 * @returns {Promise<Function>} Compiled Handlebars template function
 */
async function getCompiledTemplate(templatePath) {
  // Return cached template if available
  if (cache.has(templatePath)) {
    return cache.get(templatePath);
  }

  // Read template from disk
  const content = await readFile(templatePath, 'utf8');

  // Compile and cache
  const compiled = Handlebars.compile(content);
  cache.set(templatePath, compiled);

  return compiled;
}

/**
 * Clear all cached templates (useful for development or testing)
 */
function clearCache() {
  cache.clear();
}

/**
 * Get cache size (number of cached templates)
 */
function getCacheSize() {
  return cache.size;
}

module.exports = {
  getCompiledTemplate,
  clearCache,
  getCacheSize
};
