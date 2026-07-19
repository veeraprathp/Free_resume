function scoreTextAgainstKeywords(text, jobKeywords) {
  if (!text || !jobKeywords || !jobKeywords.length) {
    return { score: 0, matchedKeywords: [], missingKeywords: jobKeywords || [], recommendations: [] };
  }

  const lowerText = text.toLowerCase();
  const matched = [];
  const missing = [];
  jobKeywords.forEach(kw => {
    if (lowerText.includes(kw.toLowerCase())) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  });

  const keywordScore = jobKeywords.length > 0 ? (matched.length / jobKeywords.length) * 100 : 0;
  const score = Math.round(Math.min(keywordScore, 100));

  const recommendations = [];
  if (missing.length > 0) {
    recommendations.push(`Add missing keywords: ${missing.slice(0, 5).join(', ')}`);
  }
  if (score < 50) {
    recommendations.push('Resume matches less than half the job requirements. Tailor it more.');
  }
  if (score >= 80) {
    recommendations.push('Great keyword match! Focus on quantifying achievements.');
  }

  return { score, matchedKeywords: matched, missingKeywords: missing, recommendations };
}

// Scores an AI-tailored resume (the shape returned by the /resumes generate
// endpoint: tailoredSummary, tailoredExperience, etc.) against JD keywords.
function calculateATSScore(resumeContent, jobKeywords) {
  if (!resumeContent) return scoreTextAgainstKeywords('', jobKeywords);
  return scoreTextAgainstKeywords(flattenResumeToText(resumeContent), jobKeywords);
}

function flattenResumeToText(content) {
  const parts = [];
  if (content.tailoredSummary) parts.push(content.tailoredSummary);
  if (Array.isArray(content.tailoredExperience)) {
    content.tailoredExperience.forEach(exp => {
      parts.push(exp.company || '', exp.title || '');
      if (Array.isArray(exp.achievements)) parts.push(...exp.achievements);
    });
  }
  if (Array.isArray(content.tailoredSkills)) parts.push(...content.tailoredSkills);
  if (Array.isArray(content.tailoredEducation)) {
    content.tailoredEducation.forEach(edu => {
      parts.push(edu.degree || '', edu.field || '', edu.institution || '');
    });
  }
  if (Array.isArray(content.tailoredCertifications)) {
    content.tailoredCertifications.forEach(cert => parts.push(cert.name || ''));
  }
  if (Array.isArray(content.keyHighlights)) parts.push(...content.keyHighlights);
  return parts.join(' ');
}

module.exports = { calculateATSScore };
