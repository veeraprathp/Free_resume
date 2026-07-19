const express = require('express');
const { authThrottle } = require('../middleware/authThrottle');

const router = express.Router();

/**
 * POST /api/auth/throttle
 * Records one login/signup attempt for { action, email } and rejects with
 * 429 if the previous attempt for that same pair was too recent. Called by
 * the frontend right before it talks to Supabase directly.
 */
router.post('/throttle', authThrottle, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
