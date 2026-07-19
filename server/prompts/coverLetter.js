/**
 * Cover Letter Prompt Builder
 * Generates tailored prompts for AI-based cover letter generation
 */

/**
 * Build a prompt for cover letter generation based on letter type
 * @param {string} letterType - "formal" | "conversational" | "brief"
 * @param {Object} profile - User profile data
 * @param {Object} jd - Job description and company info
 * @returns {string} - The prompt text
 */
function buildCoverLetterPrompt(letterType, profile, jd) {
  const {
    fullName,
    email,
    phone,
    location,
    summary,
    experience = [],
    skills = [],
    linkedin,
    github
  } = profile;

  const { company, jobTitle, description } = jd;

  // Build profile context
  const profileContext = `
CANDIDATE INFORMATION:
Name: ${fullName}
Email: ${email || 'N/A'}
Phone: ${phone || 'N/A'}
Location: ${location || 'N/A'}
LinkedIn: ${linkedin || 'N/A'}
GitHub: ${github || 'N/A'}

PROFESSIONAL SUMMARY:
${summary || 'N/A'}

KEY EXPERIENCE:
${experience
  .slice(0, 3)
  .map(
    (exp, i) =>
      `${i + 1}. ${exp.title || 'N/A'} at ${exp.company || 'N/A'}`
  )
  .join('\n')}

KEY SKILLS:
${Array.isArray(skills) ? skills.join(', ') : skills}
  `;

  // Build job context
  const jobContext = `
TARGET JOB:
Company: ${company}
Job Title: ${jobTitle}
Job Description: ${description}
  `;

  // Letter type specific instructions
  let typeInstructions = '';
  switch (letterType) {
    case 'conversational':
      typeInstructions = `
TONE: Conversational & Personable
- Write in first person with a friendly, approachable tone
- Be authentic and show personality while remaining professional
- Use contractions (I'm, we're) for natural flow
- Tell a compelling story about why you're excited
- Keep it genuine and avoid overly formal language
- Around 3-4 paragraphs
      `;
      break;
    case 'brief':
      typeInstructions = `
TONE: Brief & Direct
- Get straight to the point
- Concise, 2-3 paragraphs maximum
- Focus only on key qualifications matching the job
- Lead with your strongest relevant achievement
- No fluff or unnecessary storytelling
- Professional but punchy tone
      `;
      break;
    case 'formal':
    default:
      typeInstructions = `
TONE: Formal & Professional
- Use formal business letter structure
- Professional, respectful language throughout
- Structure: Opening (interest in role), Body (relevant experience), Closing (call to action)
- Approximately 3-4 paragraphs
- Traditional business tone
- Address achievements with clear evidence
      `;
  }

  const fullPrompt = `You are an expert cover letter writer specializing in tailored job application letters.

${profileContext}

${jobContext}

${typeInstructions}

INSTRUCTIONS:
1. Analyze the job description to identify key requirements and company culture
2. Create a compelling opening that shows genuine interest in the role and company
3. Highlight the most relevant experiences and skills from the candidate's background
4. Connect the candidate's accomplishments to the job requirements
5. Demonstrate understanding of the company and how the candidate can contribute
6. Close with a strong call to action
7. Keep the letter authentic and engaging

FACTS — DO NOT ALTER OR INVENT:
Any employer name, job title, or date mentioned in the letter must match
CANDIDATE INFORMATION above exactly. Do not invent numbers, dates, employers,
or achievements that weren't given to you. You may choose which true facts to
emphasize and how to phrase them, but never state something as fact that
isn't in the candidate's information above.

IMPORTANT: You MUST return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "opening": "Opening paragraph that expresses interest and attention-grabbing introduction",
  "bodyParagraphs": [
    "First body paragraph connecting candidate experience to job requirements",
    "Second body paragraph highlighting relevant achievements and skills",
    "Optional third paragraph showing understanding of company and cultural fit"
  ],
  "closing": "Closing paragraph with call to action and professional sign-off",
  "personalizedElements": ["company insight 1", "company insight 2", "connection point 1"]
}

Return ONLY the JSON object, no other text.`;

  return fullPrompt;
}

module.exports = {
  buildCoverLetterPrompt
};
