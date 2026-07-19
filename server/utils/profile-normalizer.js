const { convertToJsonResume } = require('./jsonresume-validator');

function normalizeProfile(raw) {
  if (!raw) return {};

  const profile = {
    fullName: raw.fullName || raw.name || '',
    email: raw.email || '',
    phone: raw.phone || '',
    location: raw.location || '',
    linkedin: raw.linkedin || '',
    github: raw.github || '',
    summary: raw.summary || '',
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: []
  };

  if (Array.isArray(raw.skills)) {
    profile.skills = raw.skills.filter(s => typeof s === 'string');
  } else if (raw.skills && typeof raw.skills === 'object') {
    Object.values(raw.skills).forEach(val => {
      if (typeof val === 'string' && val.trim()) {
        profile.skills.push(...val.split(',').map(s => s.trim()).filter(Boolean));
      }
    });
  } else if (typeof raw.skills === 'string') {
    profile.skills = raw.skills.split(',').map(s => s.trim()).filter(Boolean);
  }

  const flatSkillFields = ['skillLanguages', 'skillAIML', 'skillBackend', 'skillCloud', 'skillFrontend', 'skillHumanLangs'];
  flatSkillFields.forEach(field => {
    if (raw[field] && typeof raw[field] === 'string') {
      profile.skills.push(...raw[field].split(',').map(s => s.trim()).filter(Boolean));
    }
  });
  profile.skills = [...new Set(profile.skills)];

  if (Array.isArray(raw.experience)) {
    profile.experience = raw.experience.map(exp => {
      let startDate = exp.startDate || '';
      let endDate = exp.endDate || '';
      if (exp.dates && !startDate) {
        const parts = exp.dates.split(/\s*[-–]\s*/);
        startDate = parts[0] || '';
        endDate = parts[1] || '';
      }
      return {
        title: exp.title || exp.position || '',
        company: exp.company || exp.name || '',
        startDate,
        endDate,
        description: exp.description || '',
        highlights: exp.highlights || exp.bullets || []
      };
    });
  }

  if (Array.isArray(raw.education)) {
    profile.education = raw.education.map(edu => ({
      degree: edu.degree || edu.studyType || '',
      field: edu.field || edu.area || '',
      institution: edu.institution || edu.school || '',
      year: edu.year || edu.graduationDate || edu.endDate || ''
    }));
  }

  if (Array.isArray(raw.projects)) {
    profile.projects = raw.projects.map(p => ({
      name: p.name || '',
      description: p.description || '',
      link: p.link || p.url || ''
    }));
  }

  if (Array.isArray(raw.certifications)) {
    profile.certifications = raw.certifications.map(c => {
      if (typeof c === 'string') return { name: c, date: '' };
      return { name: c.name || '', date: c.date || c.dateObtained || '' };
    });
  }

  return profile;
}

module.exports = { normalizeProfile };
