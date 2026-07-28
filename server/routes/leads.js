/**
 * API Route: POST /api/leads
 * Appends a captured email to a Google Sheet (the app's lead list). Uses
 * Application Default Credentials -- no key file/secret to manage, since
 * Cloud Run's own attached service account can be granted Sheets access
 * directly via IAM (share the target sheet with that service account's
 * email). Locally, this only works if `gcloud auth application-default
 * login` has been run; otherwise it fails closed (see below).
 */

const express = require('express');
const { google } = require('googleapis');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  if (!process.env.GOOGLE_SHEETS_ID) {
    // Misconfiguration on our end shouldn't block the user from downloading
    // their resume -- log it for us to notice, but don't fail the request.
    console.error('[LEADS] GOOGLE_SHEETS_ID is not set — skipping save');
    return res.json({ ok: true, saved: false });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A:B',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[email.trim(), new Date().toISOString()]],
      },
    });

    res.json({ ok: true, saved: true });
  } catch (error) {
    console.error('[LEADS] Failed to append to sheet:', error.message);
    // Same reasoning as the missing-config case above -- a backend/IAM issue
    // on our side shouldn't be the user's problem.
    res.json({ ok: true, saved: false });
  }
});

module.exports = router;
