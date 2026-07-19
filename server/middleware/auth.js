/**
 * Application Token Authentication Middleware
 * Lightweight protection using X-App-Token header
 */

function appTokenAuth(req, res, next) {
  const appToken = process.env.APP_TOKEN;

  // Skip auth in development if not configured
  if (!appToken) {
    return next();
  }

  const providedToken = req.headers['x-app-token'];

  if (providedToken !== appToken) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing X-App-Token header.' });
  }

  next();
}

module.exports = { appTokenAuth };
