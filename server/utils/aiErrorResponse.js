/**
 * Maps a callAI() error to a user-facing HTTP status + message.
 * Returns null if the error doesn't match a known category, so callers
 * can fall back to their own generic 500 response.
 */
function aiErrorResponse(error) {
  const msg = error.message || '';

  if (/\b401\b|Unauthorized|\b403\b/.test(msg)) {
    return { status: 401, body: { error: 'AI provider authentication failed. Check your API key.' } };
  }

  if (/\b429\b|rate.?limit/i.test(msg)) {
    return { status: 429, body: { error: 'Rate limit reached. Try a different API key or provider.' } };
  }

  return null;
}

module.exports = { aiErrorResponse };
