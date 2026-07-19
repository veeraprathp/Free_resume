/**
 * PDF Generation Utility
 * Uses Puppeteer to convert HTML to PDF with connection pooling
 */

const browserPool = require('./browserPool');

/**
 * Generate PDF from HTML string
 * @param {string} html - HTML content to convert to PDF
 * @param {object} options - PDF generation options
 * @param {string} options.format - Paper format (A4, Letter, etc.)
 * @param {object} options.margin - Margin object with top, right, bottom, left
 * @param {boolean} options.printBackground - Include background colors/images
 * @returns {Promise<Buffer>} PDF as Buffer
 */
async function generatePDF(html, options = {}) {
  const {
    format = 'A4',
    margin = { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    printBackground = true
  } = options;

  let browser;
  try {
    console.log('[PDF] Acquiring browser from pool...');
    browser = await browserPool.acquire();

    console.log('[PDF] Creating new page...');
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // Block network requests to prevent SSRF (only allow data: URIs for inline resources)
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:') || url === 'about:blank') {
        request.continue();
      } else {
        request.abort('blockedbyclient');
      }
    });

    console.log('[PDF] Setting page content...');
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('[PDF] Generating PDF...');
    const pdf = await page.pdf({
      format,
      margin,
      printBackground,
      timeout: 30000
    });

    console.log('[PDF] PDF generated successfully');
    return pdf;
  } catch (error) {
    console.error('[PDF] Error during PDF generation:', error.message);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      console.log('[PDF] Releasing browser back to pool');
      try {
        await browserPool.release(browser);
      } catch (releaseError) {
        console.error('[PDF] Error releasing browser:', releaseError.message);
      }
    }
  }
}

module.exports = { generatePDF };
