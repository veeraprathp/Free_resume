/**
 * Express Application Setup
 * Mounts API routes for resume and cover letter generation
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { globalLimiter, generateLimiter, pdfLimiter } = require('./middleware/rateLimiter');
const { appTokenAuth } = require('./middleware/auth');
const pdfRouter = require('./routes/pdf');
const templatesRouter = require('./routes/templates');
const resumesRouter = require('./routes/resumes');
const coverlettersRouter = require('./routes/coverletters');
const authRouter = require('./routes/auth');

const app = express();

// Security middleware
app.use(helmet());

// CORS — restrict via CORS_ORIGIN env var in production (comma-separated origins); allows all if unset
app.use(cors(process.env.CORS_ORIGIN
  ? { origin: process.env.CORS_ORIGIN.split(',').map(o => o.trim()) }
  : {}));

app.use(express.json({ limit: '10mb' })); // Support large profile data
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Global rate limiting
app.use(globalLimiter);

// Request timeout middleware for different endpoints
function requestTimeout(ms) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    }, ms);
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

// Health check endpoint (no rate limit needed)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API Routes with authentication, rate limiters, and timeouts
app.use('/api/pdf', appTokenAuth, pdfLimiter, requestTimeout(30000), pdfRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/resumes', appTokenAuth, generateLimiter, requestTimeout(120000), resumesRouter);
app.use('/api/coverletters', appTokenAuth, generateLimiter, requestTimeout(120000), coverlettersRouter);
app.use('/api/auth', authRouter); // no appTokenAuth — unrelated to AI keys, just the login/signup cooldown

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    ...(isDev && { message: err.message })
  });
});

module.exports = app;
