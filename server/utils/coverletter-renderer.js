/**
 * Cover Letter Renderer
 * Renders cover letter data with Handlebars templates
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

/**
 * Render cover letter using specified template
 * @param {Object} coverLetterData - Cover letter data (profile, jd, content)
 * @param {string} templateId - Template ID (e.g., 'formal-professional')
 * @returns {Promise<string>} - Rendered HTML
 */
async function renderCoverLetter(coverLetterData, templateId) {
  try {
    const templateDir = path.join(__dirname, '../templates/cover-letter', templateId);
    const templatePath = path.join(templateDir, 'letter.hbs');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Cover letter template not found: ${templatePath}`);
    }

    // Read template
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateContent);

    // Read and inject styles
    const stylesPath = path.join(templateDir, 'styles.css');
    let styles = '';
    if (fs.existsSync(stylesPath)) {
      styles = fs.readFileSync(stylesPath, 'utf8');
    }

    // Add current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Prepare template data
    const templateData = {
      ...coverLetterData,
      currentDate: currentDate,
      styles: styles
    };

    // Render
    const html = template(templateData);
    return html;
  } catch (error) {
    throw new Error(`Cover letter rendering failed: ${error.message}`);
  }
}

/**
 * Get cover letter template metadata
 * @param {string} templateId - Template ID
 * @returns {Object} - Template metadata
 */
function getTemplateMetadata(templateId) {
  try {
    const metaPath = path.join(
      __dirname,
      '../templates/cover-letter',
      templateId,
      'meta.json'
    );

    if (!fs.existsSync(metaPath)) {
      throw new Error(`Template metadata not found: ${metaPath}`);
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    // The id must match the actual directory name (what renderCoverLetter looks up),
    // not whatever id happens to be authored inside meta.json.
    return { ...meta, id: templateId };
  } catch (error) {
    throw new Error(`Failed to load template metadata: ${error.message}`);
  }
}

/**
 * List all available cover letter templates
 * @returns {Array} - Array of template metadata
 */
function getAllTemplates() {
  try {
    const templatesDir = path.join(__dirname, '../templates/cover-letter');
    const dirs = fs.readdirSync(templatesDir).filter(f => {
      const stat = fs.statSync(path.join(templatesDir, f));
      return stat.isDirectory() && !f.startsWith('_');
    });

    return dirs
      .map(dir => {
        try {
          return getTemplateMetadata(dir);
        } catch (err) {
          console.error(`Failed to load metadata for ${dir}:`, err.message);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    throw new Error(`Failed to list templates: ${error.message}`);
  }
}

/**
 * Get templates filtered by tone or category
 * @param {Object} filters - Filter options (tone, category)
 * @returns {Array} - Filtered templates
 */
function filterTemplates(filters = {}) {
  const allTemplates = getAllTemplates();

  return allTemplates.filter(template => {
    if (filters.tone && template.tone !== filters.tone) {
      return false;
    }
    if (filters.category && template.category !== filters.category) {
      return false;
    }
    return true;
  });
}

module.exports = {
  renderCoverLetter,
  getTemplateMetadata,
  getAllTemplates,
  filterTemplates
};
