/**
 * Input Validation Utilities
 * Prevents path traversal and other injection attacks
 */

const VALID_RESUME_TYPES = [
  'classic', 'modern', 'minimal',
  '01-modern-gradient', '02-creative-portfolio', '03-tech-forward',
  '04-classic-professional', '05-executive-clean', '06-corporate-structured',
  '07-ats-minimal', '08-ats-single-column', '09-academic-cv', '10-designer-portfolio'
];
const VALID_COVER_LETTER_TYPES = [
  'formal', 'conversational', 'brief',
  '01-formal-professional', '02-conversational-modern', '03-brief-concise', '04-creative-bold'
];

/**
 * Validate and sanitize template type against allowlist
 * @param {string} type - Template type from user input
 * @param {string[]} validTypes - Allowlist of valid types
 * @param {string} defaultType - Default type if invalid
 * @returns {string} Safe template type
 */
function sanitizeTemplateType(type, validTypes, defaultType) {
  if (typeof type === 'string' && validTypes.includes(type)) {
    return type;
  }
  return defaultType;
}

module.exports = {
  VALID_RESUME_TYPES,
  VALID_COVER_LETTER_TYPES,
  sanitizeTemplateType
};
