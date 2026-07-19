/**
 * Post-generation safety net for factual resume fields.
 *
 * Prompt instructions alone aren't reliable enough to guarantee an LLM never
 * touches a date, institution name, or employer — this is a known failure
 * mode (weaker/local models especially, which BYOK lets users pick freely).
 * So after the AI call, force these fields back to exactly what the user
 * entered, matching entries by position. Only facts are restored; summary,
 * achievement wording, skill selection, and keyHighlights are left as the
 * AI wrote them — that's the actual tailoring work.
 */

function formatDuration(startDate, endDate) {
  const start = (startDate || '').trim();
  const end = (endDate || '').trim();
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
}

function restoreExperienceFacts(tailoredExperience, originalExperience) {
  if (!Array.isArray(tailoredExperience) || !Array.isArray(originalExperience)) {
    return tailoredExperience;
  }

  return tailoredExperience.map((exp, i) => {
    const original = originalExperience[i];
    if (!original) return exp;
    return {
      ...exp,
      company: original.company || '',
      title: original.title || '',
      duration: formatDuration(original.startDate, original.endDate)
    };
  });
}

function restoreEducationFacts(tailoredEducation, originalEducation) {
  if (!Array.isArray(tailoredEducation) || !Array.isArray(originalEducation)) {
    return tailoredEducation;
  }

  return tailoredEducation.map((edu, i) => {
    const original = originalEducation[i];
    if (!original) return edu;
    return {
      ...edu,
      degree: original.degree || '',
      field: original.field || '',
      institution: original.institution || '',
      year: original.year || ''
    };
  });
}

// Unlike experience/education, there's no AI value-add on certifications —
// no bullets to rewrite, nothing to tailor. So rather than trying to match
// and patch whatever the model returned (which may drop the list entirely,
// a common LLM failure mode for fields with no obvious "work" to do), just
// replace it outright with the user's actual certifications.
function restoreCertificationFacts(originalCertifications) {
  if (!Array.isArray(originalCertifications)) return [];
  return originalCertifications.map(cert => ({
    name: cert.name || '',
    date: cert.date || ''
  }));
}

/**
 * Overwrites factual fields in an AI-tailored resume with the user's
 * original profile values. Mutates nothing — returns a new object.
 */
function enforceFactualIntegrity(resumeContent, normalizedProfile) {
  if (!resumeContent) return resumeContent;

  return {
    ...resumeContent,
    tailoredExperience: restoreExperienceFacts(
      resumeContent.tailoredExperience,
      normalizedProfile.experience
    ),
    tailoredEducation: restoreEducationFacts(
      resumeContent.tailoredEducation,
      normalizedProfile.education
    ),
    tailoredCertifications: restoreCertificationFacts(normalizedProfile.certifications)
  };
}

module.exports = { enforceFactualIntegrity };
