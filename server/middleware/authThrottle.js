/**
 * Auth Attempt Throttle
 * Enforces a minimum gap between login/signup attempts for the same
 * (action, email) pair. Enforced here rather than only in the browser so it
 * can't be reset by refreshing the page or clearing local state — the actual
 * credential check still happens client-side against Supabase; this endpoint
 * only records attempt timestamps, so no Supabase secret needs to live here.
 */

const COOLDOWN_SECONDS = 30;
const COOLDOWN_MS = COOLDOWN_SECONDS * 1000;

const lastAttempt = new Map(); // key: `${action}:${email}` -> timestamp

// Periodic sweep so this Map doesn't grow unbounded in a long-running process
setInterval(() => {
  const cutoff = Date.now() - COOLDOWN_MS;
  for (const [key, ts] of lastAttempt) {
    if (ts < cutoff) lastAttempt.delete(key);
  }
}, 5 * 60 * 1000).unref();

function authThrottle(req, res, next) {
  const action = String(req.body?.action || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!action || !email) {
    return res.status(400).json({ error: 'action and email are required' });
  }

  const key = `${action}:${email}`;
  const now = Date.now();
  const last = lastAttempt.get(key);

  if (last && now - last < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: `Too many attempts — try again in ${retryAfter}s`,
      retryAfter,
    });
  }

  lastAttempt.set(key, now);
  next();
}

module.exports = { authThrottle, COOLDOWN_SECONDS };
