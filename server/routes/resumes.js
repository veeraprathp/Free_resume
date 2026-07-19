const express = require('express');
const multer = require('multer');
const router = express.Router();
const { callAI } = require('../ai');
const { buildResumePrompt } = require('../prompts/resume');
const { buildResumeParsePrompt } = require('../prompts/resumeParse');
const { normalizeProfile } = require('../utils/profile-normalizer');
const { parseJobDescription } = require('../utils/job-parser');
const { calculateATSScore } = require('../utils/ats-scorer');
const { enforceFactualIntegrity } = require('../utils/resume-integrity');
const { renderResume } = require('../utils/resume-renderer');
const { parseAIJson } = require('../utils/parseAIJson');
const { extractText } = require('../utils/resumeTextExtract');

const ALLOWED_RESUME_MIMETYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown'
]);
const ALLOWED_RESUME_EXTENSIONS = /\.(pdf|docx|txt|md)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okMime = ALLOWED_RESUME_MIMETYPES.has(file.mimetype);
    const okExt = ALLOWED_RESUME_EXTENSIONS.test(file.originalname || '');
    if (!okMime && !okExt) {
      return cb(new Error('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.'));
    }
    cb(null, true);
  }
});

function resolveMimetype(file) {
  if (ALLOWED_RESUME_MIMETYPES.has(file.mimetype)) return file.mimetype;
  if (/\.pdf$/i.test(file.originalname)) return 'application/pdf';
  if (/\.docx$/i.test(file.originalname)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'text/plain';
}

router.post('/', async (req, res) => {
  try {
    const { profile, jobDescription, provider, apiKey, model, baseURL, resumeType = 'classic' } = req.body;

    if (!profile || !profile.fullName) return res.status(400).json({ error: 'profile.fullName is required' });
    if (!jobDescription) return res.status(400).json({ error: 'jobDescription is required' });
    if (!provider || !apiKey || !model) return res.status(400).json({ error: 'provider, apiKey, and model are required' });

    const normalizedProfile = normalizeProfile(profile);
    const parsedJob = parseJobDescription(jobDescription);

    const jd = {
      company: req.body.company || 'the company',
      jobTitle: req.body.jobTitle || 'the position',
      description: jobDescription
    };

    const prompt = buildResumePrompt(resumeType, normalizedProfile, jd);

    console.log('[RESUMES] Calling AI for resume generation...');
    const aiResponse = await callAI({ provider, apiKey, model, prompt, baseURL });

    let resumeContent;
    try {
      resumeContent = parseAIJson(aiResponse);
    } catch (parseError) {
      console.error('[RESUMES] Failed to parse AI response:', parseError.message);
      return res.status(502).json({ error: 'AI response was not valid JSON. Try again.' });
    }

    // Belt-and-suspenders: the prompt tells the model to copy dates/employer/
    // institution verbatim, but instruction-following isn't guaranteed across
    // every BYOK provider/model — force these facts back to the user's actual
    // input regardless of what the model returned.
    resumeContent = enforceFactualIntegrity(resumeContent, normalizedProfile);

    const atsResult = calculateATSScore(resumeContent, parsedJob.keywords);

    res.json({
      resumeContent,
      atsScore: atsResult.score,
      matchedKeywords: atsResult.matchedKeywords,
      missingKeywords: atsResult.missingKeywords,
      recommendations: atsResult.recommendations
    });
  } catch (error) {
    console.error('[RESUMES] Error:', error.message);
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return res.status(401).json({ error: 'AI provider authentication failed. Check your API key.' });
    }
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: 'Resume generation failed', ...(isDev && { message: error.message }) });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const { resumeContent, templateId, includePhoto = false, profile } = req.body;

    if (!resumeContent) return res.status(400).json({ error: 'resumeContent is required' });
    if (!templateId) return res.status(400).json({ error: 'templateId is required' });

    const normalizedProfile = profile ? normalizeProfile(profile) : {};

    const jsonResumeData = {
      basics: {
        name: normalizedProfile.fullName || '',
        label: '',
        email: normalizedProfile.email || '',
        phone: normalizedProfile.phone || '',
        image: profile?.photo || '',
        summary: resumeContent.tailoredSummary || normalizedProfile.summary || '',
        location: { city: normalizedProfile.location || '', region: '' }
      },
      work: (resumeContent.tailoredExperience || []).map(exp => ({
        name: exp.company || '',
        position: exp.title || '',
        startDate: exp.duration ? exp.duration.split(' - ')[0] : '',
        endDate: exp.duration ? exp.duration.split(' - ')[1] || '' : '',
        highlights: exp.achievements || []
      })),
      education: (resumeContent.tailoredEducation || []).map(edu => ({
        institution: edu.institution || '',
        studyType: edu.degree || '',
        area: edu.field || '',
        endDate: edu.year || ''
      })),
      certificates: (resumeContent.tailoredCertifications || []).map(cert => ({
        name: cert.name || '',
        issuer: cert.issuer || '',
        date: cert.date || ''
      })),
      skills: (resumeContent.tailoredSkills || []).length > 0
        ? [{ name: 'Skills', keywords: resumeContent.tailoredSkills }]
        : [],
      languages: []
    };

    const html = await renderResume(jsonResumeData, templateId, includePhoto);
    res.json({ html });
  } catch (error) {
    console.error('[RESUMES] Preview error:', error.message);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: 'Preview generation failed', ...(isDev && { message: error.message }) });
  }
});

router.post('/ats-score', (req, res) => {
  try {
    const { resumeContent, jobDescription } = req.body;
    if (!resumeContent || !jobDescription) return res.status(400).json({ error: 'resumeContent and jobDescription required' });

    const parsedJob = parseJobDescription(jobDescription);
    const result = calculateATSScore(resumeContent, parsedJob.keywords);
    res.json(result);
  } catch (error) {
    console.error('[RESUMES] ATS score error:', error.message);
    res.status(500).json({ error: 'ATS scoring failed' });
  }
});

// No AI call, no API key required — pure keyword/requirement extraction from JD text
router.post('/analyze-jd', (req, res) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription) return res.status(400).json({ error: 'jobDescription is required' });

    const parsedJob = parseJobDescription(jobDescription);
    res.json(parsedJob);
  } catch (error) {
    console.error('[RESUMES] Analyze JD error:', error.message);
    res.status(500).json({ error: 'Job description analysis failed' });
  }
});

// Validates a BYOK key/provider/model combo with a trivial, cheap completion
router.post('/test-key', async (req, res) => {
  try {
    const { provider, apiKey, model, baseURL } = req.body;
    if (!provider || !apiKey || !model) {
      return res.status(400).json({ error: 'provider, apiKey, and model are required' });
    }

    await callAI({ provider, apiKey, model, baseURL, prompt: 'Reply with exactly: OK' });
    res.json({ ok: true });
  } catch (error) {
    console.error('[RESUMES] Test key error:', error.message);
    if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('403')) {
      return res.status(401).json({ ok: false, error: 'AI provider authentication failed. Check your API key.' });
    }
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ ok: false, error: 'Key validation failed', ...(isDev && { message: error.message }) });
  }
});

// Uploads a resume file, extracts its text, and asks the AI to structure it into a profile object
router.post('/parse', (req, res) => {
  upload.single('resume')(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ error: uploadError.message || 'File upload failed' });
    }

    try {
      const { provider, apiKey, model, baseURL } = req.body;
      if (!req.file) return res.status(400).json({ error: 'A resume file is required' });
      if (!provider || !apiKey || !model) {
        return res.status(400).json({ error: 'provider, apiKey, and model are required' });
      }

      const mimetype = resolveMimetype(req.file);
      let rawText;
      try {
        rawText = await extractText(req.file.buffer, mimetype);
      } catch (extractError) {
        console.error('[RESUMES] Text extraction failed:', extractError.message);
        return res.status(422).json({ error: 'Could not read this file — it may be empty, corrupted, or not a valid PDF/DOCX.' });
      }
      if (!rawText || !rawText.trim()) {
        return res.status(422).json({ error: 'Could not extract any text from the uploaded file' });
      }

      const prompt = buildResumeParsePrompt(rawText);
      console.log('[RESUMES] Calling AI to parse uploaded resume...');
      const aiResponse = await callAI({ provider, apiKey, model, prompt, baseURL });

      let parsedProfile;
      try {
        parsedProfile = parseAIJson(aiResponse);
      } catch (parseError) {
        console.error('[RESUMES] Failed to parse AI response for resume upload:', parseError.message);
        return res.status(502).json({ error: 'AI response was not valid JSON. Try again.' });
      }

      res.json({ profile: normalizeProfile(parsedProfile) });
    } catch (error) {
      console.error('[RESUMES] Parse error:', error.message);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return res.status(401).json({ error: 'AI provider authentication failed. Check your API key.' });
      }
      const isDev = process.env.NODE_ENV !== 'production';
      res.status(500).json({ error: 'Resume parsing failed', ...(isDev && { message: error.message }) });
    }
  });
});

module.exports = router;
