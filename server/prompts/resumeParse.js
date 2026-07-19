function buildResumeParsePrompt(rawText) {
  return `You are an expert resume parser. Convert the raw resume text below into a single structured JSON object.

RAW RESUME TEXT:
"""
${rawText}
"""

IMPORTANT: You MUST return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, no commentary):
{
  "fullName": "candidate's full name",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "location": "city, state/country or empty string",
  "linkedin": "LinkedIn URL or empty string",
  "github": "GitHub URL or empty string",
  "summary": "professional summary, written from the resume content if none is explicitly present",
  "skills": ["skill 1", "skill 2", "..."],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "startDate": "start date as written",
      "endDate": "end date as written, or 'Present'",
      "description": "one-line role summary",
      "highlights": ["achievement/bullet 1", "achievement/bullet 2"]
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "field": "field of study",
      "institution": "school name",
      "year": "graduation year"
    }
  ],
  "projects": [
    { "name": "project name", "description": "short description", "link": "URL or empty string" }
  ],
  "certifications": [
    { "name": "certification name", "date": "date obtained or empty string" }
  ]
}

Rules:
- Extract only information actually present in the text; do not invent employers, dates, or credentials.
- If a section (projects, certifications) has no content in the resume, return an empty array for it.
- Return ONLY the JSON object, no other text.`;
}

module.exports = { buildResumeParsePrompt };
