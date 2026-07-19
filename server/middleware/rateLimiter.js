/**
 * Rate Limiting Middleware
 * Protects endpoints from abuse and DoS attacks
 */

const rateLimit = require('express-rate-limit');

// Global rate limiter: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true'
});

// AI generation limiter: 10 requests per minute per IP (expensive operation)
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many generation requests, please try again later' },
  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true'
});

// PDF generation limiter: 5 requests per minute per IP (spawns Chromium)
const pdfLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many PDF requests, please try again later' },
  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true'
});

module.exports = {
  globalLimiter,
  generateLimiter,
  pdfLimiter
};
