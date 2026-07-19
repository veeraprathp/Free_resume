/**
 * JSON Resume Validator
 * Validates resume data against JSON Resume schema
 * Schema: https://jsonresume.org/schema
 */

/**
 * Minimal JSON Resume Schema v1.0.0
 * Full schema: https://github.com/jsonresume/resume-schema/blob/master/schema.json
 */
const JSONRESUME_SCHEMA = {
  type: 'object',
  properties: {
    basics: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        label: { type: 'string' },
        image: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        url: { type: 'string' },
        summary: { type: 'string' },
        location: {
          type: 'object',
          properties: {
            address: { type: 'string' },
            postalCode: { type: 'string' },
            city: { type: 'string' },
            countryCode: { type: 'string' },
            region: { type: 'string' }
          }
        },
        profiles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              network: { type: 'string' },
              username: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    },
    work: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          position: { type: 'string' },
          description: { type: 'string' },
          url: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          summary: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' }
        }
      }
    },
    volunteer: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          organization: { type: 'string' },
          position: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          summary: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          studyType: { type: 'string' },
          area: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          score: { type: 'string' },
          courses: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    awards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          date: { type: 'string' },
          awarder: { type: 'string' },
          summary: { type: 'string' }
        }
      }
    },
    certificates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          date: { type: 'string' },
          issuer: { type: 'string' },
          url: { type: 'string' }
        }
      }
    },
    publications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          publisher: { type: 'string' },
          releaseDate: { type: 'string' },
          website: { type: 'string' },
          summary: { type: 'string' }
        }
      }
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          language: { type: 'string' },
          fluency: { type: 'string' }
        }
      }
    },
    interests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    references: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reference: { type: 'string' }
        }
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } },
          keywords: { type: 'array', items: { type: 'string' } },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          url: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          entity: { type: 'string' },
          type: { type: 'string' }
        }
      }
    }
  }
};

/**
 * Validate resume data against JSON Resume schema
 * @param {Object} resumeData - Resume data to validate
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
function validateResume(resumeData) {
  const errors = [];

  // Basic checks
  if (!resumeData) {
    errors.push('Resume data is required');
    return { valid: false, errors };
  }

  if (typeof resumeData !== 'object') {
    errors.push('Resume data must be an object');
    return { valid: false, errors };
  }

  // Check required fields
  if (!resumeData.basics) {
    errors.push('basics section is required');
  } else {
    const basics = resumeData.basics;
    if (!basics.name || typeof basics.name !== 'string') {
      errors.push('basics.name is required and must be a string');
    }
  }

  // Validate sections if present
  if (resumeData.work && Array.isArray(resumeData.work)) {
    resumeData.work.forEach((job, idx) => {
      if (!job.name && !job.company) {
        errors.push(`work[${idx}]: either name or company is required`);
      }
      if (!job.position) {
        errors.push(`work[${idx}]: position is required`);
      }
    });
  }

  if (resumeData.education && Array.isArray(resumeData.education)) {
    resumeData.education.forEach((edu, idx) => {
      if (!edu.institution) {
        errors.push(`education[${idx}]: institution is required`);
      }
    });
  }

  if (resumeData.skills && !Array.isArray(resumeData.skills)) {
    errors.push('skills must be an array');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Convert simple resume format to JSON Resume format
 * Used to normalize user input data
 * @param {Object} simpleResume - Simple resume format
 * @returns {Object} - JSON Resume format
 */
function convertToJsonResume(simpleResume) {
  return {
    basics: {
      name: simpleResume.fullName || '',
      label: simpleResume.jobTitle || '',
      image: simpleResume.photo || '',
      email: simpleResume.email || '',
      phone: simpleResume.phone || '',
      url: simpleResume.website || '',
      summary: simpleResume.summary || '',
      location: {
        city: simpleResume.city || '',
        region: simpleResume.state || '',
        countryCode: simpleResume.country || ''
      }
    },
    work: (simpleResume.experience || []).map(job => ({
      name: job.company || '',
      position: job.jobTitle || '',
      startDate: job.startDate || '',
      endDate: job.endDate || '',
      summary: job.description || '',
      highlights: job.highlights || job.bullets || []
    })),
    education: (simpleResume.education || []).map(edu => ({
      institution: edu.institution || '',
      studyType: edu.degree || '',
      area: edu.field || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || ''
    })),
    skills: Object.entries(simpleResume.skills || {}).map(([name, keywords]) => ({
      name: name,
      keywords: Array.isArray(keywords) ? keywords : [keywords]
    })),
    languages: (simpleResume.languages || []).map(lang => ({
      language: lang.name || lang,
      fluency: lang.level || 'Unknown'
    }))
  };
}

module.exports = {
  validateResume,
  convertToJsonResume,
  JSONRESUME_SCHEMA
};
