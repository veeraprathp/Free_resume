/**
 * Resume Renderer
 * Renders resume data with Handlebars templates
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Register Handlebars helpers for resume formatting
Handlebars.registerHelper('formatDate', (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
});

Handlebars.registerHelper('dateRange', (startDate, endDate) => {
  const start = new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  const end = endDate ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Present';
  return `${start} - ${end}`;
});

Handlebars.registerHelper('section', function(condition, options) {
  return condition ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifArray', function(array, options) {
  return (array && array.length > 0) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('join', function(array, separator) {
  if (!Array.isArray(array)) return '';
  return array.join(typeof separator === 'string' ? separator : ', ');
});

/**
 * Render resume using specified template
 * @param {Object} resumeData - JSON Resume format data
 * @param {string} templateId - Template ID (e.g., 'modern-gradient')
 * @param {boolean} includePhoto - Whether to render photo variant
 * @returns {Promise<string>} - Rendered HTML
 */
async function renderResume(resumeData, templateId, includePhoto = true) {
  try {
    const templateDir = path.join(__dirname, '../templates/resume', templateId);

    // Choose variant based on photo preference, falling back to whichever
    // variant the template actually has — several templates only ship
    // without-photo.hbs, and a profile photo shouldn't hard-fail those.
    const preferredVariant = includePhoto && resumeData.basics?.image ? 'with-photo' : 'without-photo';
    const fallbackVariant = preferredVariant === 'with-photo' ? 'without-photo' : 'with-photo';
    let variant = preferredVariant;
    let templatePath = path.join(templateDir, `${variant}.hbs`);

    if (!fs.existsSync(templatePath)) {
      variant = fallbackVariant;
      templatePath = path.join(templateDir, `${variant}.hbs`);
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
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

    // Prepare template data
    const templateData = {
      ...resumeData,
      includePhoto: includePhoto && !!resumeData.basics?.image,
      styles: styles
    };

    // Render
    const html = template(templateData);
    return html;
  } catch (error) {
    throw new Error(`Resume rendering failed: ${error.message}`);
  }
}

/**
 * Get template metadata
 * @param {string} templateId - Template ID
 * @returns {Object} - Template metadata
 */
function getTemplateMetadata(templateId) {
  try {
    const metaPath = path.join(
      __dirname,
      '../templates/resume',
      templateId,
      'meta.json'
    );

    if (!fs.existsSync(metaPath)) {
      throw new Error(`Template metadata not found: ${metaPath}`);
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    // The id must match the actual directory name (what renderResume looks up),
    // not whatever id happens to be authored inside meta.json.
    return { ...meta, id: templateId };
  } catch (error) {
    throw new Error(`Failed to load template metadata: ${error.message}`);
  }
}

/**
 * List all available templates with metadata
 * @returns {Array} - Array of template metadata
 */
function getAllTemplates() {
  try {
    const templatesDir = path.join(__dirname, '../templates/resume');
    const dirs = fs.readdirSync(templatesDir).filter(f => {
      const dirPath = path.join(templatesDir, f);
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory() || f.startsWith('_')) return false;
      // A handful of template dirs only have meta.json so far, with no .hbs
      // written yet — exclude them so they never appear as a pickable option
      // that fails at render time.
      const hasMarkup = fs.existsSync(path.join(dirPath, 'with-photo.hbs')) ||
        fs.existsSync(path.join(dirPath, 'without-photo.hbs'));
      return hasMarkup;
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
 * Get templates filtered by criteria
 * @param {Object} filters - Filter options
 * @returns {Array} - Filtered templates
 */
function filterTemplates(filters = {}) {
  const allTemplates = getAllTemplates();

  return allTemplates.filter(template => {
    if (filters.ats_friendly !== undefined && template.ats_friendly !== filters.ats_friendly) {
      return false;
    }
    if (filters.category && template.category !== filters.category) {
      return false;
    }
    if (filters.supports_photo !== undefined && template.supports_photo !== filters.supports_photo) {
      return false;
    }
    return true;
  });
}

module.exports = {
  renderResume,
  getTemplateMetadata,
  getAllTemplates,
  filterTemplates
};
