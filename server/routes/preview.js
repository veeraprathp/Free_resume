/**
 * API Route: POST /api/preview
 * Previews resume and/or cover letter without AI tailoring
 * Fast preview using only templates and raw profile data
 */

const express = require('express');
const path = require('path');
const { VALID_RESUME_TYPES, VALID_COVER_LETTER_TYPES, sanitizeTemplateType } = require('../middleware/validators');
const { getCompiledTemplate } = require('../templateCache');

const router = express.Router();

/**
 * Build simple resume HTML without AI
 * Uses raw profile data to render template
 * Maps raw profile fields to template expectations
 */
async function buildResumeHTML(profile, resumeType) {
  try {
    // Sanitize template type
    resumeType = sanitizeTemplateType(resumeType, VALID_RESUME_TYPES, 'classic');

    const templatePath = path.join(
      __dirname,
      `../templates/resume/${resumeType}.hbs`
    );

    // Verify path stays within templates directory
    const templatesDir = path.resolve(__dirname, '../templates');
    const resolvedPath = path.resolve(templatePath);
    if (!resolvedPath.startsWith(templatesDir)) {
      throw new Error('Invalid template path');
    }

    // Get compiled template from cache
    const template = await getCompiledTemplate(templatePath);

    // Transform profile data to match template expectations
    // Map raw fields to tailored fields for template rendering
    const templateData = {
      ...profile,
      generatedAt: new Date().toISOString(),
      isPreview: true
    };

    // Map summary to tailoredSummary
    if (profile.summary && !templateData.tailoredSummary) {
      templateData.tailoredSummary = profile.summary;
    }

    // Map experience array to tailoredExperience format
    if (profile.experience && Array.isArray(profile.experience)) {
      templateData.tailoredExperience = profile.experience.map(exp => ({
        title: exp.title,
        company: exp.company,
        duration: exp.dates,
        location: exp.location,
        achievements: exp.bullets || []
      }));
    }

    // Map education array to tailoredEducation format
    if (profile.education && Array.isArray(profile.education)) {
      templateData.tailoredEducation = profile.education.map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        year: edu.dates,
        field: edu.field
      }));
    }

    // Combine all skills into tailoredSkills array
    if (!templateData.tailoredSkills) {
      const skillsArray = [];
      if (profile.skillLanguages) skillsArray.push(...profile.skillLanguages.split(',').map(s => s.trim()));
      if (profile.skillAIML) skillsArray.push(...profile.skillAIML.split(',').map(s => s.trim()));
      if (profile.skillBackend) skillsArray.push(...profile.skillBackend.split(',').map(s => s.trim()));
      if (profile.skillCloud) skillsArray.push(...profile.skillCloud.split(',').map(s => s.trim()));
      if (profile.skillFrontend) skillsArray.push(...profile.skillFrontend.split(',').map(s => s.trim()));
      if (profile.skillHumanLangs) skillsArray.push(...profile.skillHumanLangs.split(',').map(s => s.trim()));
      if (skillsArray.length > 0) {
        templateData.tailoredSkills = [...new Set(skillsArray)]; // Remove duplicates
      }
    }

    const html = template(templateData);
    return html;
  } catch (error) {
    throw new Error(`Resume template compilation failed: ${error.message}`);
  }
}

/**
 * Build simple cover letter HTML without AI
 * Uses raw profile data to render template
 * Creates basic opening/body/closing from profile and JD
 */
async function buildCoverLetterHTML(profile, jd, letterType) {
  try {
    // Sanitize template type
    letterType = sanitizeTemplateType(letterType, VALID_COVER_LETTER_TYPES, 'formal');

    const templatePath = path.join(
      __dirname,
      `../templates/cover-letter/${letterType}.hbs`
    );

    // Verify path stays within templates directory
    const templatesDir = path.resolve(__dirname, '../templates');
    const resolvedPath = path.resolve(templatePath);
    if (!resolvedPath.startsWith(templatesDir)) {
      throw new Error('Invalid template path');
    }

    // Get compiled template from cache
    const template = await getCompiledTemplate(templatePath);

    // Prepare template data with both profile and JD
    const templateData = {
      ...profile,
      ...jd,
      generatedAt: new Date().toISOString(),
      isPreview: true
    };

    // Generate basic cover letter content if not provided
    // Extract most recent job experience
    const currentJob = profile.experience && profile.experience.length > 0
      ? profile.experience[0]
      : null;

    // Create opening paragraph
    if (!templateData.opening) {
      if (letterType === 'formal') {
        templateData.opening = `I am writing to express my strong interest in the ${jd.jobTitle} position at ${jd.company}. With my background in artificial intelligence and machine learning, I am confident that I can make significant contributions to your team.`;
      } else if (letterType === 'conversational') {
        templateData.opening = `I'm excited about the ${jd.jobTitle} role at ${jd.company}! As an ML engineer passionate about building intelligent systems, I've been following your work and would love to contribute to your next-gen language models.`;
      } else { // brief
        templateData.opening = `I'm interested in the ${jd.jobTitle} position at ${jd.company}. My experience with large language models and distributed training aligns well with this role.`;
      }
    }

    // Create body paragraphs
    if (!templateData.bodyParagraphs) {
      const paragraphs = [];

      if (currentJob) {
        const jobContext = letterType === 'formal'
          ? `In my current role as a ${currentJob.title} at ${currentJob.company}, I have `
          : letterType === 'conversational'
          ? `At ${currentJob.company}, I've been `
          : `In my role as a ${currentJob.title}, I've `;

        paragraphs.push(
          jobContext + `developed deep expertise with large language models, transformers, and distributed training. I've worked on optimizing training pipelines and improving inference performance, which directly addresses the key requirements mentioned in your job description.`
        );
      }

      if (letterType === 'formal' || letterType === 'conversational') {
        paragraphs.push(
          `Beyond my technical skills in Python, PyTorch, and cloud platforms, I'm driven by a passion for advancing AI systems responsibly. Your company's mission resonates deeply with me, and I'm eager to contribute to research that will shape the future of language models.`
        );
      }

      templateData.bodyParagraphs = paragraphs;
    }

    // Create closing paragraph
    if (!templateData.closing) {
      if (letterType === 'formal') {
        templateData.closing = `I welcome the opportunity to discuss how my experience and passion for AI can contribute to ${jd.company}'s continued success. Thank you for considering my application.`;
      } else if (letterType === 'conversational') {
        templateData.closing = `I'd love to chat more about how I can help push the boundaries of language models at ${jd.company}. Thanks for considering my application!`;
      } else { // brief
        templateData.closing = `I'm confident my background aligns well with your needs. Looking forward to discussing this opportunity.`;
      }
    }

    const html = template(templateData);
    return html;
  } catch (error) {
    throw new Error(`Cover letter template compilation failed: ${error.message}`);
  }
}

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

  // Check generate parameter
  if (!body.generate || !['resume', 'cover_letter', 'both'].includes(body.generate)) {
    errors.push('Invalid generate parameter. Must be "resume", "cover_letter", or "both"');
  }

  return errors;
}

/**
 * POST /api/preview
 * Preview resume and/or cover letter without AI (no API calls)
 */
router.post('/', async (req, res) => {
  try {
    console.log('[PREVIEW] Received request');
    console.log(`[PREVIEW] Requested documents: ${req.body.generate}`);

    // Validate request
    const validationErrors = validateRequest(req.body);
    if (validationErrors.length > 0) {
      console.error('[PREVIEW] Validation failed:', validationErrors);
      return res.status(400).json({
        error: `Validation error: ${validationErrors.join('; ')}`
      });
    }

    let {
      profile,
      jd,
      resumeType = 'classic',
      coverLetterType = 'formal',
      generate
    } = req.body;

    const response = {};

    try {
      // Generate Resume Preview if requested
      if (generate === 'resume' || generate === 'both') {
        console.log('[PREVIEW] Building resume preview...');
        response.resumeHtml = await buildResumeHTML(profile, resumeType);
        console.log('[PREVIEW] Resume preview generated successfully');
      }

      // Generate Cover Letter Preview if requested
      if (generate === 'cover_letter' || generate === 'both') {
        console.log('[PREVIEW] Building cover letter preview...');
        response.coverLetterHtml = await buildCoverLetterHTML(profile, jd, coverLetterType);
        console.log('[PREVIEW] Cover letter preview generated successfully');
      }

      console.log('[PREVIEW] Request completed successfully');
      res.status(200).json(response);
    } catch (compilationError) {
      console.error('[PREVIEW] Template compilation error:', compilationError.message);
      return res.status(500).json({
        error: 'Preview generation failed. Please try again later.'
      });
    }
  } catch (error) {
    console.error('[PREVIEW] Unexpected error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Internal server error',
      ...(isDev && { message: error.message })
    });
  }
});

module.exports = router;
