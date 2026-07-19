import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// ApplyJob — Side Panel Core Logic
// Uses native Chrome APIs + Supabase for auth.

'use strict';

  // ============================
  // STORAGE HELPERS
  // ============================
  const Storage = {
    async get(keys) {
      const result = {};
      const keyList = typeof keys === 'string' ? [keys] : (Array.isArray(keys) ? keys : Object.keys(keys));
      keyList.forEach(k => {
        const raw = localStorage.getItem(k);
        result[k] = raw ? JSON.parse(raw) : undefined;
      });
      return result;
    },
    async set(data) {
      Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
    }
  };

  // ============================
  // AUTH UI HELPERS
  // ============================
  let _isLoggedIn = false;
  let _isOfflineMode = false;

  function showAuthScreen() {
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('mainPanel').style.display = 'none';
  }

  function showMainPanel() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'flex';
  }

  async function initAuth() {
    const Auth = window.ApplyJobAuth;
    if (!Auth || !Auth.isConfigured()) {
      // Supabase not configured → skip auth, go straight to main
      _isOfflineMode = true;
      showMainPanel();
      return;
    }

    const session = await Auth.getSession();
    if (session) {
      _isLoggedIn = true;
      showMainPanel();
      await updateUserMenu();
    } else {
      showAuthScreen();
    }
  }

  function initAuthUI() {
    // Toggle login ↔ signup
    document.getElementById('showSignupLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('signupForm').style.display = 'block';
    });

    document.getElementById('showLoginLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('signupForm').style.display = 'none';
      document.getElementById('loginForm').style.display = 'block';
    });

    // Login
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
      const Auth = window.ApplyJobAuth;
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      const errorEl = document.getElementById('authError');

      if (!email || !password) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
      }

      errorEl.textContent = '';
      const { data, error } = await Auth.signIn(email, password);

      if (error) {
        errorEl.textContent = error.message;
        return;
      }

      _isLoggedIn = true;
      showMainPanel();
      await updateUserMenu();
    });

    // Sign up
    document.getElementById('signupBtn')?.addEventListener('click', async () => {
      const Auth = window.ApplyJobAuth;
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const errorEl = document.getElementById('signupError');

      if (!name || !email || !password) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
      }
      if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        return;
      }

      errorEl.textContent = '';
      const { data, error } = await Auth.signUp(email, password, name);

      if (error) {
        errorEl.textContent = error.message;
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        errorEl.style.color = 'var(--green)';
        errorEl.textContent = '✅ Check your email to confirm your account!';
        return;
      }

      _isLoggedIn = true;
      showMainPanel();
      await updateUserMenu();
    });

    // Skip auth (offline mode)
    document.getElementById('skipAuthLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      _isOfflineMode = true;
      showMainPanel();
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      const Auth = window.ApplyJobAuth;
      await Auth.signOut();
      _isLoggedIn = false;
      document.getElementById('userDropdown').style.display = 'none';
      showAuthScreen();
    });

    // User menu toggle
    document.getElementById('userMenuBtn')?.addEventListener('click', () => {
      const dd = document.getElementById('userDropdown');
      dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    });

    // Upgrade button
    document.getElementById('upgradeBtn')?.addEventListener('click', async () => {
      await handleUpgradeClick();
    });
  }

  async function updateUserMenu() {
    const Auth = window.ApplyJobAuth;
    if (!Auth || !_isLoggedIn) {
      document.getElementById('userMenu').style.display = 'none';
      return;
    }
    const user = await Auth.getUser();
    if (!user) return;

    const profile = await Auth.getUserProfile();
    setText('userDisplayName', profile?.full_name || user.user_metadata?.full_name || 'User');
    setText('userDisplayEmail', user.email);
  }

  async function updateQuotaHints() {
    // Disabled in BYOK mode
  }

  async function checkAndGateGeneration(type) {
    return true; // Always allowed in BYOK mode
  }


  async function trackGeneration(type) {
    if (_isOfflineMode || !_isLoggedIn) return;
    const Auth = window.ApplyJobAuth;
    if (!Auth || !Auth.isConfigured()) return;
    await Auth.incrementUsage(type);
    await updateUserMenu();
    await updateQuotaHints();
  }

  // ============================
  // TAB SWITCHING
  // ============================
  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;

        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`tab-${target}`).classList.add('active');
      });
    });
  }

  // ============================
  // PROFILE TAB
  // ============================
  const PROFILE_FIELDS = ['fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'summary',
    'skillLanguages', 'skillAIML', 'skillBackend', 'skillCloud', 'skillFrontend', 'skillHumanLangs',
    'clBody1', 'clBody2'];

  async function loadProfile() {
    const { profile } = await Storage.get('profile');
    if (!profile) return;

    // Simple fields
    PROFILE_FIELDS.forEach(field => {
      const el = document.getElementById(field);
      if (el && profile[field]) el.value = profile[field];
    });

    // FIX: Clear existing dynamic entries before repopulating (prevents duplicates)
    document.getElementById('experienceList').innerHTML = '';
    document.getElementById('educationList').innerHTML = '';
    document.getElementById('projectsList').innerHTML = '';
    document.getElementById('certsList').innerHTML = '';

    // Experience
    if (profile.experience) {
      profile.experience.forEach(exp => addExperienceEntry(exp));
    }

    // Education
    if (profile.education) {
      profile.education.forEach(edu => addEducationEntry(edu));
    }

    // Projects
    if (profile.projects) {
      profile.projects.forEach(proj => addProjectEntry(proj));
    }

    // Certifications
    if (profile.certifications) {
      profile.certifications.forEach(cert => addCertEntry(cert));
    }
  }

  function collectProfile() {
    const profile = {};

    // Simple fields
    PROFILE_FIELDS.forEach(field => {
      const el = document.getElementById(field);
      if (el) profile[field] = el.value.trim();
    });

    // Experience
    profile.experience = [];
    document.querySelectorAll('#experienceList .dynamic-entry').forEach(entry => {
      const bullets = [];
      entry.querySelectorAll('.bullet-row input').forEach(inp => {
        if (inp.value.trim()) bullets.push(inp.value.trim());
      });
      profile.experience.push({
        title: entry.querySelector('.exp-title')?.value.trim() || '',
        company: entry.querySelector('.exp-company')?.value.trim() || '',
        dates: entry.querySelector('.exp-dates')?.value.trim() || '',
        location: entry.querySelector('.exp-location')?.value.trim() || '',
        bullets
      });
    });

    // Education
    profile.education = [];
    document.querySelectorAll('#educationList .dynamic-entry').forEach(entry => {
      profile.education.push({
        degree: entry.querySelector('.edu-degree')?.value.trim() || '',
        institution: entry.querySelector('.edu-institution')?.value.trim() || '',
        dates: entry.querySelector('.edu-dates')?.value.trim() || ''
      });
    });

    // Projects
    profile.projects = [];
    document.querySelectorAll('#projectsList .dynamic-entry').forEach(entry => {
      profile.projects.push({
        name: entry.querySelector('.proj-name')?.value.trim() || '',
        description: entry.querySelector('.proj-desc')?.value.trim() || ''
      });
    });

    // Certifications
    profile.certifications = [];
    document.querySelectorAll('#certsList .dynamic-entry').forEach(entry => {
      const val = entry.querySelector('.cert-name')?.value.trim();
      if (val) profile.certifications.push(val);
    });

    return profile;
  }

  async function saveProfile() {
    const profile = collectProfile();
    await Storage.set({ profile });

    const status = document.getElementById('saveStatus');
    status.textContent = '✅ Profile saved successfully!';
    status.className = 'save-status success';
    setTimeout(() => { status.className = 'save-status'; }, 3000);
  }

  // ============================
  // DYNAMIC LIST ENTRIES
  // ============================
  function addExperienceEntry(data = {}) {
    const container = document.getElementById('experienceList');
    const entry = document.createElement('div');
    entry.className = 'dynamic-entry';

    const bullets = data.bullets || [''];
    const bulletsHTML = bullets.map(b => `
      <div class="bullet-row">
        <input type="text" value="${escapeHTML(b)}" placeholder="Achievement bullet point...">
        <button class="remove-bullet" title="Remove">✕</button>
      </div>
    `).join('');

    entry.innerHTML = `
      <button class="remove-btn" title="Remove">✕</button>
      <div class="form-group">
        <label>Job Title</label>
        <input type="text" class="exp-title" value="${escapeHTML(data.title || '')}" placeholder="Software Engineer">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Company</label>
          <input type="text" class="exp-company" value="${escapeHTML(data.company || '')}" placeholder="Company Name">
        </div>
        <div class="form-group">
          <label>Dates</label>
          <input type="text" class="exp-dates" value="${escapeHTML(data.dates || '')}" placeholder="Jan 2024 - Present">
        </div>
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" class="exp-location" value="${escapeHTML(data.location || '')}" placeholder="City, Country">
      </div>
      <div class="form-group">
        <label>Achievements</label>
        <div class="bullet-list">${bulletsHTML}</div>
        <button class="add-bullet-btn">+ Add bullet</button>
      </div>
    `;

    entry.querySelector('.remove-btn').addEventListener('click', () => entry.remove());
    entry.querySelector('.add-bullet-btn').addEventListener('click', () => {
      const bulletList = entry.querySelector('.bullet-list');
      const row = document.createElement('div');
      row.className = 'bullet-row';
      row.innerHTML = `<input type="text" placeholder="Achievement bullet point..."><button class="remove-bullet" title="Remove">✕</button>`;
      row.querySelector('.remove-bullet').addEventListener('click', () => row.remove());
      bulletList.appendChild(row);
    });

    entry.querySelectorAll('.remove-bullet').forEach(btn => {
      btn.addEventListener('click', () => btn.parentElement.remove());
    });

    container.appendChild(entry);
  }

  function addEducationEntry(data = {}) {
    const container = document.getElementById('educationList');
    const entry = document.createElement('div');
    entry.className = 'dynamic-entry';
    entry.innerHTML = `
      <button class="remove-btn" title="Remove">✕</button>
      <div class="form-group">
        <label>Degree</label>
        <input type="text" class="edu-degree" value="${escapeHTML(data.degree || '')}" placeholder="M.Sc. Computer Science">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Institution</label>
          <input type="text" class="edu-institution" value="${escapeHTML(data.institution || '')}" placeholder="University Name">
        </div>
        <div class="form-group">
          <label>Dates</label>
          <input type="text" class="edu-dates" value="${escapeHTML(data.dates || '')}" placeholder="Oct 2023 - Present">
        </div>
      </div>
    `;
    entry.querySelector('.remove-btn').addEventListener('click', () => entry.remove());
    container.appendChild(entry);
  }

  function addProjectEntry(data = {}) {
    const container = document.getElementById('projectsList');
    const entry = document.createElement('div');
    entry.className = 'dynamic-entry';
    entry.innerHTML = `
      <button class="remove-btn" title="Remove">✕</button>
      <div class="form-group">
        <label>Project Name</label>
        <input type="text" class="proj-name" value="${escapeHTML(data.name || '')}" placeholder="Project Name">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" class="proj-desc" value="${escapeHTML(data.description || '')}" placeholder="Brief description with tech highlights">
      </div>
    `;
    entry.querySelector('.remove-btn').addEventListener('click', () => entry.remove());
    container.appendChild(entry);
  }

  function addCertEntry(certName = '') {
    const container = document.getElementById('certsList');
    const entry = document.createElement('div');
    entry.className = 'dynamic-entry';
    entry.innerHTML = `
      <button class="remove-btn" title="Remove">✕</button>
      <div class="form-group">
        <input type="text" class="cert-name" value="${escapeHTML(certName)}" placeholder="Certification Name - Provider, Year">
      </div>
    `;
    entry.querySelector('.remove-btn').addEventListener('click', () => entry.remove());
    container.appendChild(entry);
  }

  // ============================
  // JD TAB — KEYWORDS (Scraping removed for website)
  // ============================

  // ============================
  // KEYWORD EXTRACTION & ATS SCORE
  // ============================
  // Common tech keywords to detect in job descriptions
  const TECH_KEYWORDS = [
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Kotlin', 'Swift', 'SQL',
    'React', 'React.js', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Jenkins', 'CI/CD', 'Git', 'GitHub',
    'PyTorch', 'TensorFlow', 'LangChain', 'OpenAI', 'LLM', 'RAG', 'NLP', 'Machine Learning', 'Deep Learning',
    'REST API', 'GraphQL', 'gRPC', 'Microservices', 'Redis', 'MongoDB', 'PostgreSQL', 'MySQL',
    'Linux', 'Agile', 'Scrum', 'DevOps', 'MLOps'
  ];

  function extractKeywords(jdText) {
    const lower = jdText.toLowerCase();
    const found = [];

    TECH_KEYWORDS.forEach(kw => {
      if (lower.includes(kw.toLowerCase())) {
        found.push(kw);
      }
    });

    return found;
  }

  async function analyzeKeywords() {
    const jdText = document.getElementById('jdText').value;
    if (!jdText.trim()) {
      alert('Please paste a job description first.');
      return;
    }

    const jdKeywords = extractKeywords(jdText);
    const { profile } = await Storage.get('profile');

    // Collect all user skills into one string
    const userSkills = profile ? [
      profile.skillLanguages,
      profile.skillAIML,
      profile.skillBackend,
      profile.skillCloud,
      profile.skillFrontend,
      profile.summary,
      ...(profile.experience || []).map(e => e.bullets?.join(' ') || '')
    ].join(' ').toLowerCase() : '';

    const matched = [];
    const missing = [];

    jdKeywords.forEach(kw => {
      if (userSkills.includes(kw.toLowerCase())) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    // Render keyword tags
    const resultsDiv = document.getElementById('keywordResults');
    let html = '';

    if (matched.length > 0) {
      html += `<div class="keyword-group">
        <div class="keyword-group-title">✅ Matched (${matched.length})</div>
        <div class="keyword-tags">${matched.map(k => `<span class="keyword-tag match">${k}</span>`).join('')}</div>
      </div>`;
    }

    if (missing.length > 0) {
      html += `<div class="keyword-group">
        <div class="keyword-group-title">⚠️ Missing from your profile (${missing.length})</div>
        <div class="keyword-tags">${missing.map(k => `<span class="keyword-tag miss">${k}</span>`).join('')}</div>
      </div>`;
    }

    if (jdKeywords.length === 0) {
      html = '<p class="hint-text">No common tech keywords detected. This may be a non-technical role.</p>';
    }

    resultsDiv.innerHTML = html;

    // ATS Score
    const total = jdKeywords.length || 1;
    const score = Math.round((matched.length / total) * 100);

    const scoreCard = document.getElementById('atsScoreCard');
    scoreCard.style.display = 'block';

    const circle = document.getElementById('scoreCircle');
    circle.className = 'score-circle ' + (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low');

    document.getElementById('scoreNumber').textContent = score;
    document.getElementById('scoreBreakdown').innerHTML =
      `<strong>${matched.length}</strong> of <strong>${jdKeywords.length}</strong> keywords matched.<br>` +
      (score >= 70 ? '🟢 Great match! Your profile aligns well.' :
       score >= 40 ? '🟡 Decent match. Consider highlighting missing skills.' :
       '🔴 Low match. Review and update your profile skills.');
  }

  // ============================
  // DOCUMENT GENERATION
  // ============================
  async function getTemplateData() {
    const { profile } = await Storage.get('profile');
    if (!profile || !profile.fullName) {
      alert('Please fill out and save your profile first.');
      return null;
    }

    const company = document.getElementById('jdCompany').value.trim();
    const jobTitle = document.getElementById('jdTitle').value.trim();
    const jdText = document.getElementById('jdText').value.trim();

    if (!company || !jobTitle) {
      alert('Please fill in the Company and Job Title on the Job tab.');
      return null;
    }

    const jdKeywords = extractKeywords(jdText);
    const keywordsText = jdKeywords.slice(0, 6).join(', ');

    return {
      ...profile,
      companyName: company,
      jobTitle: jobTitle,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      keywordsText,
      bodyParagraph1: profile.clBody1 || '',
      bodyParagraph2: profile.clBody2 || ''
    };
  }

  function buildResumeHTML(data) {
    const expHTML = (data.experience || []).map(e => `
      <div class="entry">
        <div class="entry-title">${esc(e.title)}</div>
        <div class="entry-meta">${esc(e.company)} | ${esc(e.dates)} | ${esc(e.location)}</div>
        <ul>${(e.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      </div>
    `).join('');

    const eduHTML = (data.education || []).map(e => `
      <div class="entry">
        <div class="entry-title">${esc(e.degree)}</div>
        <div class="entry-meta">${esc(e.institution)} | ${esc(e.dates)}</div>
      </div>
    `).join('');

    const projHTML = (data.projects || []).map(p => `
      <div class="entry">
        <div class="entry-title">${esc(p.name)}</div>
        <ul><li>${esc(p.description)}</li></ul>
      </div>
    `).join('');

    const certsHTML = (data.certifications || []).map(c => `<li>${esc(c)}</li>`).join('');

    const linksLine = data.linkedin ? `<div class="contact">${esc(data.linkedin)} | ${esc(data.github || '')}</div>` : '';

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Resume - ${esc(data.fullName)}</title>
<style>
*{margin:0;padding:0}
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;color:#000;background:#fff}
.container{max-width:8.5in;padding:0.5in}
.header{text-align:center;margin-bottom:12pt;border-bottom:1px solid #000;padding-bottom:6pt}
.name{font-size:14pt;font-weight:bold;text-transform:uppercase}
.contact{font-size:10pt;margin:4pt 0}
.section{margin:10pt 0}
.section-header{font-weight:bold;font-size:12pt;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:4pt;margin-bottom:6pt}
.entry{margin-bottom:8pt}
.entry-title{font-weight:bold}
.entry-meta{font-size:10pt;color:#333}
ul{margin-left:20pt;margin-top:4pt}
li{margin:2pt 0;font-size:10pt}
.skills-grid{display:grid;grid-template-columns:1fr 1fr;gap:8pt}
.skills-grid div{font-size:10pt}
@page{margin:0.5in}
@media print{body{-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="container">
  <div class="header">
    <div class="name">${esc(data.fullName)}</div>
    <div class="contact">${esc(data.email)} | ${esc(data.phone)} | ${esc(data.location)}</div>
    ${linksLine}
  </div>

  <div class="section">
    <div class="section-header">PROFESSIONAL SUMMARY</div>
    <p>${esc(data.summary || '')}</p>
  </div>

  ${expHTML ? `<div class="section"><div class="section-header">PROFESSIONAL EXPERIENCE</div>${expHTML}</div>` : ''}

  ${eduHTML ? `<div class="section"><div class="section-header">EDUCATION</div>${eduHTML}</div>` : ''}

  <div class="section">
    <div class="section-header">TECHNICAL SKILLS</div>
    <div class="skills-grid">
      <div>
        <strong>Languages:</strong> ${esc(data.skillLanguages || '')}<br>
        <strong>AI/ML:</strong> ${esc(data.skillAIML || '')}<br>
        <strong>Backend:</strong> ${esc(data.skillBackend || '')}
      </div>
      <div>
        <strong>Cloud:</strong> ${esc(data.skillCloud || '')}<br>
        <strong>Frontend & Data:</strong> ${esc(data.skillFrontend || '')}<br>
        <strong>Human Languages:</strong> ${esc(data.skillHumanLangs || '')}
      </div>
    </div>
  </div>

  ${projHTML ? `<div class="section"><div class="section-header">PROJECTS</div>${projHTML}</div>` : ''}

  ${certsHTML ? `<div class="section"><div class="section-header">CERTIFICATIONS</div><ul>${certsHTML}</ul></div>` : ''}
</div>
</body></html>`;
  }

  function buildCoverLetterHTML(data) {
    const linksLine = data.linkedin ? `<div class="contact">${esc(data.linkedin)} | ${esc(data.github || '')}</div>` : '';

    const keywordsLine = data.keywordsText
      ? `I have production experience with tools like ${esc(data.keywordsText)}, specifically focusing on backend integration and automation.`
      : 'I have production experience designing REST APIs, containerizing applications, and orchestrating complex workflows.';

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Cover Letter - ${esc(data.fullName)}</title>
<style>
*{margin:0;padding:0}
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#000;background:#fff}
.container{max-width:8.5in;padding:0.5in}
.header{margin-bottom:24pt}
.name{font-size:12pt;font-weight:bold}
.contact{font-size:11pt;margin-bottom:2pt}
.date{margin-bottom:20pt}
.recipient{margin-bottom:20pt}
.salutation{margin-bottom:12pt}
.paragraph{margin-bottom:12pt;text-align:justify}
.signoff{margin-top:24pt}
@page{margin:0.5in}
@media print{body{-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="container">
  <div class="header">
    <div class="name">${esc(data.fullName)}</div>
    <div class="contact">${esc(data.email)} | ${esc(data.phone)} | ${esc(data.location)}</div>
    ${linksLine}
  </div>

  <div class="date">${esc(data.date)}</div>

  <div class="recipient">
    <strong>${esc(data.companyName)}</strong><br>
    Hiring Team
  </div>

  <div class="salutation">Dear Hiring Team at ${esc(data.companyName)},</div>

  <div class="paragraph">
    I am writing to express my strong interest in the <strong>${esc(data.jobTitle)}</strong> position at ${esc(data.companyName)}. Your focus on developing innovative solutions perfectly aligns with my experience and skill set. I am excited about the opportunity to contribute to your technical objectives.
  </div>

  <div class="paragraph">
    ${keywordsLine}
    ${esc(data.bodyParagraph1 || '')}
  </div>

  <div class="paragraph">
    I understand that ${esc(data.companyName)} requires engineers who can independently deliver results while collaborating closely with the broader team.
    ${esc(data.bodyParagraph2 || '')}
  </div>

  <div class="paragraph">
    Thank you for considering my application. I have attached my resume detailing my technical background, and I would welcome the opportunity to discuss how my expertise can directly benefit the team at ${esc(data.companyName)}.
  </div>

  <div class="signoff">
    Sincerely,<br><br><br>
    ${esc(data.fullName)}
  </div>
</div>
</body></html>`;
  }

  function openDocInNewTab(html, title) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  async function generateResume() {
    const data = await getTemplateData();
    if (!data) return;

    const btn = document.getElementById('genResumeBtn');
    const origText = btn.textContent;
    btn.textContent = '⏳ Generating (AI)...';
    
    const aiContent = await callLLM('resume', data, {
      company: data.companyName,
      jobTitle: data.jobTitle,
      description: document.getElementById('jdText').value
    });
    
    btn.textContent = origText;
    
    let html;
    if (aiContent) {
      html = wrapAIOutput(aiContent, 'resume', data);
    } else {
      console.log('[ApplyJob] AI failed or no key, falling back to template.');
      html = buildResumeHTML(data);
    }

    // Show preview
    showPreview(html, 'resume');

    // Open in new tab for printing/saving
    openDocInNewTab(html, `Resume_${data.fullName}`);

    // Track usage for stats
    await trackGeneration('resume');
  }

  async function generateCoverLetter() {
    const data = await getTemplateData();
    if (!data) return;

    const btn = document.getElementById('genCoverLetterBtn');
    const origText = btn.textContent;
    btn.textContent = '⏳ Generating (AI)...';

    const aiContent = await callLLM('cover_letter', data, {
      company: data.companyName,
      jobTitle: data.jobTitle,
      description: document.getElementById('jdText').value
    });

    btn.textContent = origText;
    
    let html;
    if (aiContent) {
      html = wrapAIOutput(aiContent, 'coverletter', data);
    } else {
      console.log('[ApplyJob] AI failed or no key, falling back to template.');
      html = buildCoverLetterHTML(data);
    }

    showPreview(html, 'coverletter');
    openDocInNewTab(html, `CoverLetter_${data.fullName}`);

    // Track usage
    await trackGeneration('cover_letter');
  }

  function wrapAIOutput(content, type, data) {
    const resumeStyles = `
      body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;color:#000;background:#fff;padding:0.5in}
      h1{font-size:14pt;font-weight:bold;text-transform:uppercase;text-align:center;margin-bottom:4pt}
      h2{font-size:12pt;font-weight:bold;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:2pt;margin-top:12pt;margin-bottom:6pt}
      ul{margin-left:20pt;margin-bottom:8pt}
      li{margin-bottom:2pt;font-size:10pt}
      p{margin-bottom:8pt}
      .contact-info{text-align:center;font-size:10pt;margin-bottom:12pt;border-bottom:1px solid #000;padding-bottom:6pt}
    `;

    const clStyles = `
      body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#000;background:#fff;padding:0.5in}
      p{margin-bottom:12pt;text-align:justify}
      .header{margin-bottom:24pt}
      .name{font-size:12pt;font-weight:bold}
      .date{margin-bottom:20pt}
      .recipient{margin-bottom:20pt}
      .signoff{margin-top:24pt}
    `;

    const styles = type === 'resume' ? resumeStyles : clStyles;
    
    // If resume, add a header if missing
    let header = '';
    if (type === 'resume' && !content.includes(data.fullName)) {
      header = `<h1>${esc(data.fullName)}</h1>
      <div class="contact-info">
        ${esc(data.email)} | ${esc(data.phone)} | ${esc(data.location)}<br>
        ${esc(data.linkedin || '')} ${data.github ? ' | ' + esc(data.github) : ''}
      </div>`;
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>${header}${content}</body></html>`;
  }

  // ============================
  // SETTINGS & BYOK LOGIC
  // ============================
  const SETTINGS_FIELDS = [
    'activeProvider',
    'geminiKey', 'geminiModel',
    'deepseekKey', 'deepseekModel',
    'openrouterKey', 'openrouterModel',
    'openaiKey', 'openaiModel',
    'anthropicKey', 'anthropicModel'
  ];

  async function loadSettings() {
    const { settings } = await Storage.get('settings');
    if (!settings) return;

    // Set fields
    SETTINGS_FIELDS.forEach(field => {
      const el = document.getElementById(field);
      if (el && settings[field]) el.value = settings[field];
    });
  }

  async function saveSettings() {
    const settings = { opMode: 'open_source' };

    SETTINGS_FIELDS.forEach(field => {
      const el = document.getElementById(field);
      if (el) settings[field] = el.value.trim();
    });

    await Storage.set({ settings });

    const status = document.getElementById('settingsSaveStatus');
    status.textContent = '✅ Settings saved!';
    status.className = 'save-status success';
    setTimeout(() => { status.className = 'save-status'; }, 3000);
  }

  // ============================
  // LLM API HELPERS (Vercel AI SDK)
  // ============================
  async function callLLM(type, profile, jd) {
    const { settings } = await Storage.get('settings');
    if (!settings) return null;

    const providerName = settings.activeProvider;
    const key = settings[`${providerName}Key`];
    const modelId = settings[`${providerName}Model`];

    if (!key) {
      alert(`Please provide an API key for ${providerName} in Settings.`);
      return null;
    }

    const prompt = constructPrompt(type, profile, jd);
    let provider;

    try {
      // Initialize the correct provider
      if (providerName === 'gemini') {
        provider = createGoogleGenerativeAI({ apiKey: key });
      } else if (providerName === 'anthropic') {
        provider = createAnthropic({ apiKey: key });
      } else if (providerName === 'openai') {
        provider = createOpenAI({ apiKey: key });
      } else if (providerName === 'deepseek') {
        provider = createOpenAI({ 
          apiKey: key, 
          baseURL: 'https://api.deepseek.com/v1' 
        });
      } else if (providerName === 'openrouter') {
        provider = createOpenRouter({ apiKey: key });
      }

      const { text } = await generateText({
        model: provider(modelId),
        prompt: prompt,
      });

      return cleanAIResponse(text);
    } catch (err) {
      console.error(`[ApplyJob] AI SDK Error (${providerName}):`, err);
      alert(`AI Error: ${err.message}`);
      return null;
    }
  }

  function constructPrompt(type, profile, jd) {
    const context = `
      User Profile:
      ${JSON.stringify(profile, null, 2)}

      Job Description:
      Company: ${jd.company}
      Title: ${jd.jobTitle}
      Description: ${jd.description}
    `;

    if (type === 'resume') {
      return `You are an expert ATS optimization specialist. 
      Tailor the user's resume content to match the provided job description.
      Keep the tone professional and focus on measurable achievements.
      Return the result as a raw HTML string that fits into a standard resume layout. 
      Use <h1> for name, and <h2> for sections. Use <ul> and <li> for bullets.
      Do not include <html> or <body> tags, just the inner content.
      
      CONTEXT:
      ${context}`;
    } else {
      const customNotes = document.getElementById('clCustomInstructions')?.value.trim();
      const customSection = customNotes ? `\nSPECIAL USER INSTRUCTIONS FOR THIS COVER LETTER:\n${customNotes}\n` : '';

      return `You are an expert career coach.
      Write a compelling, personalized cover letter for the user based on their profile and the job description.
      Highlight the most relevant skills and show genuine interest in the company.
      ${customSection}
      Return the result as raw HTML with <p> tags for paragraphs. 
      Include the date and professional salutation.
      
      CONTEXT:
      ${context}`;
    }
  }

  function cleanAIResponse(text) {
    // Remove markdown code blocks if present
    if (text.includes('```html')) {
      text = text.split('```html')[1].split('```')[0];
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0];
    }
    return text.trim();
  }

  async function generateBoth() {
    const isOS = true; // Forced BYOK mode
    
    const data = await getTemplateData();
    if (!data) return;

    // Trigger them sequentially
    await generateResume();
    
    // Small delay to prevent popup blocking/race conditions
    setTimeout(async () => {
      await generateCoverLetter();
    }, 1000);
  }

  // ============================
  // PREVIEW
  // ============================
  let previewCache = { resume: null, coverletter: null };

  function showPreview(html, type) {
    previewCache[type] = html;

    const frame = document.getElementById('previewFrame');

    // Create a sandboxed iframe
    frame.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    iframe.style.border = 'none';
    iframe.style.background = '#fff';
    frame.appendChild(iframe);

    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    // Update preview tab active state
    document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.preview-tab[data-preview="${type}"]`)?.classList.add('active');
  }

  function initPreviewTabs() {
    document.querySelectorAll('.preview-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const type = tab.dataset.preview;
        if (previewCache[type]) {
          showPreview(previewCache[type], type);
        }
      });
    });
  }

  // ============================
  // TRACKER TAB
  // ============================
  async function loadTracker() {
    const { applications } = await Storage.get('applications');
    renderTracker(applications || []);
  }

  function renderTracker(apps) {
    const tbody = document.getElementById('trackerBody');
    const empty = document.getElementById('trackerEmpty');

    if (apps.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';

    tbody.innerHTML = apps.map((app, i) => `
      <tr>
        <td>${esc(app.date)}</td>
        <td>${esc(app.company)}</td>
        <td>${esc(app.jobTitle)}</td>
        <td>
          <select data-index="${i}" class="status-select">
            <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
            <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
            <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            <option value="Offer" ${app.status === 'Offer' ? 'selected' : ''}>Offer</option>
          </select>
        </td>
        <td><button class="delete-app-btn" data-index="${i}" title="Delete">🗑️</button></td>
      </tr>
    `).join('');

    // Bind events
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const idx = parseInt(e.target.dataset.index);
        const { applications } = await Storage.get('applications');
        applications[idx].status = e.target.value;
        await Storage.set({ applications });
      });
    });

    tbody.querySelectorAll('.delete-app-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        // FIX: Use closest() — emoji text node inside button doesn't have dataset
        const target = e.target.closest('.delete-app-btn');
        if (!target) return;
        const idx = parseInt(target.dataset.index);
        if (isNaN(idx)) return;
        const { applications } = await Storage.get('applications');
        applications.splice(idx, 1);
        await Storage.set({ applications });
        renderTracker(applications);
      });
    });
  }

  async function trackCurrentJob() {
    const company = document.getElementById('jdCompany').value.trim();
    const jobTitle = document.getElementById('jdTitle').value.trim();

    if (!company || !jobTitle) {
      alert('Fill in Company and Job Title on the Job tab first.');
      return;
    }

    const { applications } = await Storage.get('applications');
    const apps = applications || [];

    // Check for duplicates (same company and title today)
    const today = new Date().toLocaleDateString();
    const isDuplicate = apps.some(a => a.company === company && a.jobTitle === jobTitle && a.date === today);

    if (isDuplicate) {
      alert('You have already tracked this job today.');
      return;
    }

    apps.unshift({
      date: today,
      company,
      jobTitle,
      status: 'Applied'
    });

    await Storage.set({ applications: apps });
    renderTracker(apps);
  }

  // FIX: Proper CSV escaping — handles commas, quotes, and newlines in data
  function csvEscape(str) {
    if (!str) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  }

  function exportCSV() {
    Storage.get('applications').then(({ applications }) => {
      const apps = applications || [];
      if (apps.length === 0) {
        alert('No applications to export.');
        return;
      }

      const header = 'Date,Company,Job Title,Status\n';
      const rows = apps.map(a =>
        `${csvEscape(a.date)},${csvEscape(a.company)},${csvEscape(a.jobTitle)},${csvEscape(a.status)}`
      ).join('\n');

      const csv = header + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `applications_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ============================
  // UTILITY: HTML ESCAPE
  // ============================
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // Short alias
  const esc = escapeHTML;

  // ============================
  // LISTEN FOR SCRAPED DATA
  // ============================
  // Removed: chrome.storage.onChanged listener (extension-only for JD scraping)
  // Users paste JD manually on website

  // ============================
  // INIT
  // ============================
  document.addEventListener('DOMContentLoaded', async () => {
    // Auth first
    initAuthUI();
    await initAuth();

    // Then init main UI
    initTabs();
    initPreviewTabs();
    loadProfile();
    loadTracker();

    // Profile tab
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    document.getElementById('addExperienceBtn').addEventListener('click', () => addExperienceEntry());
    document.getElementById('addEducationBtn').addEventListener('click', () => addEducationEntry());
    document.getElementById('addProjectBtn').addEventListener('click', () => addProjectEntry());
    document.getElementById('addCertBtn').addEventListener('click', () => addCertEntry());

    // Resume Import
    const resumeInput = document.getElementById('resumeUpload');
    document.getElementById('uploadBtn').addEventListener('click', () => resumeInput.click());
    resumeInput.addEventListener('change', handleResumeUpload);

    // JD tab
    document.getElementById('analyzeBtn').addEventListener('click', analyzeKeywords);

    // Generate tab
    document.getElementById('genResumeBtn').addEventListener('click', generateResume);
    document.getElementById('genCoverLetterBtn').addEventListener('click', generateCoverLetter);
    document.getElementById('genBothBtn').addEventListener('click', generateBoth);

    // Tracker tab
    document.getElementById('trackCurrentBtn').addEventListener('click', trackCurrentJob);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);

    // Settings tab
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    await loadSettings();
    
    // Force BYOK mode UI
    document.getElementById('byokSettings').style.display = 'block';
  });
  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      alert('Currently only .txt and .md files are supported for direct upload. For PDFs, please copy-paste the text into the Professional Summary temporarily and I will help you parse it, or use a .txt version.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      await parseResumeWithAI(text);
    };
    reader.readAsText(file);
  }

  async function parseResumeWithAI(text) {
    const { settings } = await Storage.get('settings');
    const isOS = settings && settings.opMode === 'open_source';

    if (!isOS) {
      alert('Resume parsing with AI is currently only available in Open Source (BYOK) mode. Please configure an API key in Settings first.');
      return;
    }

    const loading = document.getElementById('importLoading');
    loading.style.display = 'block';

    const provider = settings.activeProvider;
    const key = settings[`${provider}Key`];
    const model = settings[`${provider}Model`];

    const prompt = `You are an expert resume parser. Extract the following information from the resume text below and return it as a VALID JSON object.
    
    Fields to extract:
    - fullName
    - email
    - phone
    - location (City, Country)
    - linkedin (URL)
    - github (URL)
    - summary (Professional summary)
    - skillLanguages (e.g. Python, JS)
    - skillAIML
    - skillBackend
    - skillCloud
    - skillFrontend
    - experience: Array of { title, company, dates, location, bullets: String[] }
    - education: Array of { degree, institution, dates }
    - projects: Array of { name, description }
    - certifications: Array of String
    
    RESUME TEXT:
    ${text}`;

    try {
      let aiResponse;
      if (provider === 'gemini') aiResponse = await callGeminiAPI(prompt, key, model);
      else if (provider === 'deepseek') aiResponse = await callDeepSeekAPI(prompt, key, model);
      else if (provider === 'openrouter') aiResponse = await callOpenRouterAPI(prompt, key, model);
      else if (provider === 'openai') aiResponse = await callOpenAIAPI(prompt, key, model);
      else if (provider === 'anthropic') aiResponse = await callAnthropicAPI(prompt, key, model);

      // Clean JSON if needed (remove markdown)
      let jsonStr = aiResponse;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0];
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0];
      }

      const profile = JSON.parse(jsonStr.trim());
      await Storage.set({ profile });
      await loadProfile();
      alert('✅ Profile imported and updated successfully!');
    } catch (err) {
      console.error('[ApplyJob] Parse Error:', err);
      alert('Failed to parse resume. Ensure your API key is valid and the text is clear.');
    } finally {
      loading.style.display = 'none';
    }
  }


