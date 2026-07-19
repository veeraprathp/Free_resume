/**
 * API Route: POST /api/pdf
 * Converts HTML to PDF and returns binary PDF file
 * Used for exporting generated resumes and cover letters
 */

const express = require('express');
const { generatePDF } = require('../pdf');

const router = express.Router();

/**
 * POST /api/pdf
 * Converts provided HTML to PDF
 *
 * Request body:
 * {
 *   html: string (HTML content to convert to PDF),
 *   options: {
 *     format?: string (A4, Letter, etc. - default: A4),
 *     margin?: object ({ top, right, bottom, left } - default: 0.5in each),
 *     printBackground?: boolean (include background colors - default: true),
 *     filename?: string (for Content-Disposition header)
 *   }
 * }
 *
 * Response: PDF binary file with Content-Type: application/pdf
 */
router.post('/', async (req, res) => {
  try {
    console.log('[PDF-API] Received PDF export request');

    const { html, options = {} } = req.body;
    const MAX_HTML_SIZE = 500_000; // 500KB

    // Validate HTML content
    if (!html || typeof html !== 'string') {
      console.error('[PDF-API] Validation failed: html is required and must be a string');
      return res.status(400).json({
        error: 'Validation error: html is required and must be a string'
      });
    }

    if (html.trim().length === 0) {
      console.error('[PDF-API] Validation failed: html cannot be empty');
      return res.status(400).json({
        error: 'Validation error: html cannot be empty'
      });
    }

    const htmlLength = html.length;
    if (htmlLength > MAX_HTML_SIZE) {
      console.error(`[PDF-API] HTML too large: ${htmlLength} bytes (max: ${MAX_HTML_SIZE})`);
      return res.status(400).json({
        error: `HTML content exceeds maximum size of ${MAX_HTML_SIZE / 1000}KB`
      });
    }

    console.log(`[PDF-API] HTML content size: ${htmlLength} bytes`);

    // Validate options
    const validFormats = ['A4', 'Letter', 'Legal', 'Tabloid', 'Ledger'];
    if (options.format && !validFormats.includes(options.format)) {
      console.error(
        `[PDF-API] Invalid format: ${options.format}. Must be one of: ${validFormats.join(', ')}`
      );
      return res.status(400).json({
        error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
      });
    }

    // Validate margin object if provided
    if (options.margin && typeof options.margin !== 'object') {
      console.error('[PDF-API] Invalid margin: must be an object');
      return res.status(400).json({
        error: 'Invalid margin: must be an object with top, right, bottom, left properties'
      });
    }

    try {
      console.log('[PDF-API] Starting PDF generation...');
      const pdfBuffer = await generatePDF(html, {
        format: options.format || 'A4',
        margin: options.margin || { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
        printBackground: options.printBackground !== false
      });

      console.log(`[PDF-API] PDF generated successfully. Size: ${pdfBuffer.length} bytes`);

      // Set response headers
      const filename = (options.filename || 'document').replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Send PDF binary
      res.send(pdfBuffer);
      console.log('[PDF-API] PDF sent to client successfully');
    } catch (generationError) {
      console.error('[PDF-API] PDF generation error:', generationError.message);
      return res.status(500).json({
        error: 'PDF generation failed. Please try again later.'
      });
    }
  } catch (error) {
    console.error('[PDF-API] Unexpected error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Internal server error',
      ...(isDev && { message: error.message })
    });
  }
});

module.exports = router;
