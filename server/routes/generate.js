/**
 * API Route: POST /api/generate
 * Generates resume and/or cover letter with AI tailoring
 */

const express = require('express');
const path = require('path');
const { callAI } = require('../ai');
const { buildResumePrompt } = require('../prompts/resume');
const { buildCoverLetterPrompt } = require('../prompts/coverLetter');
const { VALID_RESUME_TYPES, VALID_COVER_LETTER_TYPES, sanitizeTemplateType } = require('../middleware/validators');
const { getCompiledTemplate } = require('../templateCache');

const router = express.Router();

/**
 * Validate required fields in request body
 */
function validateRequest(body) {
  const errors = [];

  // Check required top-level fields
  if (!body.profile || !body.profile.fullName) {
    errors.push('Missing required field: profile.fullName');
  }
  if (!body.jd || !body.jd.company) {
    errors.push('Missing required field: jd.company');
  }
  if (!body.jd || !body.jd.jobTitle) {
    errors.push('Missing required field: jd.jobTitle');
  }
  if (!body.apiKey) {
    errors.push('Missing required field: apiKey');
  }
  if (!body.provider) {
    errors.push('Missing required field: provider');
  }
  if (!body.model) {
    errors.push('Missing required field: model');
  }

  // Check generate parameter
  if (!body.generate || !['resume', 'cover_letter', 'both'].includes(body.generate)) {
    errors.push('Invalid generate parameter. Must be "resume", "cover_letter", or "both"');
  }

  return errors;
}

/**
 * Generate HTML from AI response
 * Parses JSON and compiles Handlebars template
 */
async function compileTemplate(templateType, templatePath, data, aiJson) {
  try {
    // Verify path stays within templates directory (defense-in-depth)
    const templatesDir = path.resolve(__dirname, '../templates');
    const resolvedPath = path.resolve(templatePath);
    if (!resolvedPath.startsWith(templatesDir)) {
      throw new Error('Invalid template path');
    }

    // Get compiled template from cache (or compile from disk)
    const template = await getCompiledTemplate(templatePath);

    // Merge profile and AI data
    const templateData = {
      ...data.profile,
      ...aiJson
    };

    // Add metadata
    templateData.generatedAt = new Date().toISOString();
    templateData.jobTitle = data.jd.jobTitle;
    templateData.company = data.jd.company;

    // Compile and return HTML
    const html = template(templateData);
    return html;
  } catch (error) {
    throw new Error(`Template compilation failed: ${error.message}`);
  }
}

/**
 * POST /api/generate
 * Generate resume and/or cover letter with AI tailoring
 */
router.post('/', async (req, res) => {
  try {
    console.log('[GENERATE] Received request');
    console.log(`[GENERATE] Requested documents: ${req.body.generate}`);

    // Validate request
    const validationErrors = validateRequest(req.body);
    if (validationErrors.length > 0) {
      console.error('[GENERATE] Validation failed:', validationErrors);
      return res.status(400).json({
        error: `Validation error: ${validationErrors.join('; ')}`
      });
    }

    let {
      profile,
      jd,
      resumeType = 'classic',
      coverLetterType = 'formal',
      generate,
      provider,
      apiKey,
      model,
      baseURL
    } = req.body;

    // Sanitize template types to prevent path traversal
    resumeType = sanitizeTemplateType(resumeType, VALID_RESUME_TYPES, 'classic');
    coverLetterType = sanitizeTemplateType(coverLetterType, VALID_COVER_LETTER_TYPES, 'formal');

    const response = {};

    try {
      // Generate Resume if requested
      if (generate === 'resume' || generate === 'both') {
        console.log('[GENERATE] Building resume prompt...');
        const resumePrompt = buildResumePrompt(resumeType, profile, jd);

        console.log('[GENERATE] Calling AI for resume...');
        const aiResponse = await callAI({
          provider,
          apiKey,
          model,
          prompt: resumePrompt,
          baseURL
        });

        console.log('[GENERATE] Parsing AI response for resume...');
        let aiJson;
        try {
          // Handle potential markdown code blocks
          let cleanedResponse = aiResponse.trim();
          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.split('```json')[1].split('```')[0].trim();
          } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.split('```')[1].split('```')[0].trim();
          }
          aiJson = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error('[GENERATE] JSON parse error:', parseError.message);
          throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
        }

        console.log('[GENERATE] Compiling resume template...');
        const templatePath = path.join(
          __dirname,
          `../templates/resume/${resumeType}.hbs`
        );
        response.resumeHtml = await compileTemplate('resume', templatePath, req.body, aiJson);
        console.log('[GENERATE] Resume generated successfully');
      }

      // Generate Cover Letter if requested
      if (generate === 'cover_letter' || generate === 'both') {
        console.log('[GENERATE] Building cover letter prompt...');
        const coverLetterPrompt = buildCoverLetterPrompt(
          coverLetterType,
          profile,
          jd
        );

        console.log('[GENERATE] Calling AI for cover letter...');
        const aiResponse = await callAI({
          provider,
          apiKey,
          model,
          prompt: coverLetterPrompt,
          baseURL
        });

        console.log('[GENERATE] Parsing AI response for cover letter...');
        let aiJson;
        try {
          // Handle potential markdown code blocks
          let cleanedResponse = aiResponse.trim();
          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.split('```json')[1].split('```')[0].trim();
          } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.split('```')[1].split('```')[0].trim();
          }
          aiJson = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error('[GENERATE] JSON parse error:', parseError.message);
          throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
        }

        console.log('[GENERATE] Compiling cover letter template...');
        const templatePath = path.join(
          __dirname,
          `../templates/cover-letter/${coverLetterType}.hbs`
        );
        response.coverLetterHtml = await compileTemplate('cover-letter', templatePath, req.body, aiJson);
        console.log('[GENERATE] Cover letter generated successfully');
      }

      console.log('[GENERATE] Request completed successfully');
      res.status(200).json(response);
    } catch (aiError) {
      console.error('[GENERATE] AI or compilation error:', aiError.message);
      // Categorize errors for user-friendly messages
      if (aiError.message.includes('401') || aiError.message.includes('Unauthorized') || aiError.message.includes('invalid API key')) {
        return res.status(401).json({
          error: 'AI provider authentication failed. Check your API key.'
        });
      } else if (aiError.message.includes('parse') || aiError.message.includes('JSON')) {
        return res.status(502).json({
          error: 'AI response was not in expected format. Try again.'
        });
      }
      return res.status(500).json({
        error: 'Generation failed. Please try again later.'
      });
    }
  } catch (error) {
    console.error('[GENERATE] Unexpected error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Internal server error',
      ...(isDev && { message: error.message })
    });
  }
});

module.exports = router;
