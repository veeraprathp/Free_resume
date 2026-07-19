const express = require('express');
const router = express.Router();
const { callAI } = require('../ai');
const { buildCoverLetterPrompt } = require('../prompts/coverLetter');
const { normalizeProfile } = require('../utils/profile-normalizer');
const { renderCoverLetter } = require('../utils/coverletter-renderer');
const { parseAIJson } = require('../utils/parseAIJson');
const { aiErrorResponse } = require('../utils/aiErrorResponse');

router.post('/', async (req, res) => {
  try {
    const { profile, jobDescription, tone = 'formal', provider, apiKey, model, baseURL } = req.body;

    if (!profile || !profile.fullName) return res.status(400).json({ error: 'profile.fullName is required' });
    if (!jobDescription) return res.status(400).json({ error: 'jobDescription is required' });
    if (!provider || !apiKey || !model) return res.status(400).json({ error: 'provider, apiKey, and model are required' });

    const normalizedProfile = normalizeProfile(profile);
    const jd = {
      company: req.body.company || 'the company',
      jobTitle: req.body.jobTitle || 'the position',
      description: jobDescription
    };

    const prompt = buildCoverLetterPrompt(tone, normalizedProfile, jd);

    console.log('[COVERLETTERS] Calling AI for cover letter...');
    const aiResponse = await callAI({ provider, apiKey, model, prompt, baseURL });

    let coverLetterContent;
    try {
      coverLetterContent = parseAIJson(aiResponse);
    } catch (parseError) {
      console.error('[COVERLETTERS] Failed to parse AI response:', parseError.message);
      return res.status(502).json({ error: 'AI response was not valid JSON. Try again.' });
    }

    res.json({ coverLetterContent });
  } catch (error) {
    console.error('[COVERLETTERS] Error:', error.message);
    const known = aiErrorResponse(error);
    if (known) return res.status(known.status).json(known.body);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: 'Cover letter generation failed', ...(isDev && { message: error.message }) });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const { coverLetterContent, templateId, profile, jd } = req.body;

    if (!coverLetterContent) return res.status(400).json({ error: 'coverLetterContent is required' });
    if (!templateId) return res.status(400).json({ error: 'templateId is required' });

    const normalizedProfile = profile ? normalizeProfile(profile) : {};
    const coverLetterData = {
      profile: normalizedProfile,
      jd: jd || {},
      content: coverLetterContent
    };

    const html = await renderCoverLetter(coverLetterData, templateId);
    res.json({ html });
  } catch (error) {
    console.error('[COVERLETTERS] Preview error:', error.message);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: 'Cover letter preview failed', ...(isDev && { message: error.message }) });
  }
});

module.exports = router;
