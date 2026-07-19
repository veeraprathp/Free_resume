/**
 * Resume Prompt Builder
 * Generates tailored prompts for AI-based resume generation
 */

/**
 * Build a prompt for resume generation based on resume type
 * @param {string} resumeType - "classic" | "modern" | "minimal"
 * @param {Object} profile - User profile data
 * @param {Object} jd - Job description and company info
 * @returns {string} - The prompt text
 */
function buildResumePrompt(resumeType, profile, jd) {
  const {
    fullName,
    summary,
    experience = [],
    education = [],
    skills = [],
    projects = [],
    certifications = []
  } = profile;

  const { company, jobTitle, description } = jd;

  // Build profile context
  const profileContext = `
PROFILE OVERVIEW:
Name: ${fullName}
Current Summary: ${summary || 'N/A'}

EXPERIENCE:
${experience
  .map(
    (exp, i) =>
      `${i + 1}. ${exp.title || 'N/A'} at ${exp.company || 'N/A'} (${exp.startDate || 'N/A'} - ${exp.endDate || 'N/A'})
   Description: ${exp.description || 'N/A'}`
  )
  .join('\n')}

EDUCATION:
${education
  .map(
    (edu, i) =>
      `${i + 1}. ${edu.degree || 'N/A'} in ${edu.field || 'N/A'} from ${edu.institution || 'N/A'} (${edu.year || 'N/A'})`
  )
  .join('\n')}

SKILLS:
${Array.isArray(skills) ? skills.join(', ') : skills}

PROJECTS:
${projects
  .map(
    (proj, i) =>
      `${i + 1}. ${proj.name || 'N/A'}: ${proj.description || 'N/A'}`
  )
  .join('\n')}

CERTIFICATIONS:
${certifications
  .map(
    (cert, i) =>
      `${i + 1}. ${cert.name || 'N/A'} (${cert.date || 'N/A'})`
  )
  .join('\n')}
  `;

  // Build job context
  const jobContext = `
TARGET JOB:
Company: ${company}
Job Title: ${jobTitle}
Description: ${description}
  `;

  // Resume type specific instructions
  let typeInstructions = '';
  switch (resumeType) {
    case 'modern':
      typeInstructions = `
FORMAT: Modern Resume
- Use clean, contemporary formatting with subtle design elements
- Include a compelling professional summary (2-3 lines)
- Highlight key achievements with metrics and impact
- Use bullet points with strong action verbs
- Include relevant links (GitHub, LinkedIn, portfolio)
- Keep it to 1 page if possible, max 2 pages
      `;
      break;
    case 'minimal':
      typeInstructions = `
FORMAT: Minimal Resume
- Use clean, simple formatting with no design frills
- Single column layout, ATS-friendly
- Focus on core achievements and measurable results
- Concise bullet points (one line each when possible)
- Maximum 1 page
- Ensure 100% ATS compatibility
      `;
      break;
    case 'classic':
    default:
      typeInstructions = `
FORMAT: Classic Resume
- Traditional, professional layout
- Two-column possible (left sidebar optional)
- Clear section headers and consistent formatting
- Detailed but concise descriptions
- Professional tone throughout
- Can be 1-2 pages
      `;
  }

  const fullPrompt = `You are an expert resume writer and ATS optimization specialist. Your task is to tailor a resume for a specific job application.

${profileContext}

${jobContext}

${typeInstructions}

INSTRUCTIONS:
1. Analyze the target job description and identify key skills, requirements, and keywords
2. Tailor the candidate's experience, skills, and summary to match the job
3. Rewrite bullet points to use ATS-friendly keywords from the JD
4. Prioritize relevant experience and skills for this specific role
5. Create a compelling professional summary (2-3 sentences) tailored to this position

FACTUAL FIELDS — COPY EXACTLY, NEVER CHANGE OR INVENT:
The candidate's employers, job titles, employment dates, institutions, degrees,
fields of study, and graduation years are FACTS, not content to optimize. Copy
these values character-for-character from PROFILE OVERVIEW above:
- Experience: "company", "title", and the dates (combine start/end into
  "duration" using exactly the dates given, e.g. "Jan 2023 - Present" — never
  shift, round, or guess a date, and never invent an end date like "Present"
  unless the profile itself says so)
- Education: "degree", "field", "institution", "year" — copy exactly, do not
  normalize institution names, do not change the graduation year
- Certifications: "name" and "date" — copy exactly; include every
  certification from PROFILE OVERVIEW, do not drop any and do not invent new
  ones
If a field is missing from the profile, leave it as an empty string. Do not
fill in a plausible-sounding value.

CONTENT YOU MAY REWRITE (this is the actual tailoring work):
- Professional summary — rewrite freely to match the role
- Achievement bullet wording — rephrase with ATS keywords from the JD, but
  every bullet must stay truthful to what the candidate actually did; do not
  invent new employers, dates, or metrics inside the bullet text either
- Skill selection, ordering, and phrasing — pick and word the most relevant
  ones for this JD
- keyHighlights — your own synthesis of what makes this candidate fit

IMPORTANT: You MUST return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "tailoredSummary": "A 2-3 sentence professional summary tailored for this role",
  "tailoredExperience": [
    {
      "company": "company name — copied exactly from the profile",
      "title": "job title — copied exactly from the profile",
      "duration": "dates — copied exactly from the profile, do not alter",
      "achievements": [
        "Achievement 1 with metrics",
        "Achievement 2 with metrics",
        "Achievement 3 with metrics"
      ]
    }
  ],
  "tailoredSkills": ["Skill 1", "Skill 2", "Skill 3", ...],
  "tailoredEducation": [
    {
      "degree": "degree name — copied exactly from the profile",
      "field": "field of study — copied exactly from the profile",
      "institution": "university name — copied exactly from the profile",
      "year": "graduation year — copied exactly from the profile"
    }
  ],
  "tailoredCertifications": [
    {
      "name": "certification name — copied exactly from the profile",
      "date": "date — copied exactly from the profile"
    }
  ],
  "keyHighlights": ["highlight 1", "highlight 2", "highlight 3"]
}

Return ONLY the JSON object, no other text.`;

  return fullPrompt;
}

module.exports = {
  buildResumePrompt
};
