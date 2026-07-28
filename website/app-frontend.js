const CONFIG = {
  BACKEND_URL: window.__APPLYJOB_API_URL__ || 'http://localhost:3000/api',
  // AI connection now happens via the quick-connect modal (or the full
  // settings modal, opened from the sidebar) rather than a wizard step.
  STEPS: ['profile', 'generate'],
};

// Providers that run at a caller-supplied URL and therefore need the Base URL field
const BASE_URL_PROVIDERS = ['custom', 'ollama'];

// ===== PROFILE PHOTO =====
// Everything here is client-side only — a photo becomes a compressed base64
// data URI stored in the hidden #profilePhoto input, which rides through
// localStorage and request bodies exactly like every other profile field.
const PHOTO_MAX_RAW_BYTES = 5 * 1024 * 1024; // reject raw uploads over this before ever reading them
const PHOTO_ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PHOTO_MAX_DIM = 400; // downscale target — plenty for a resume header/sidebar photo
const PHOTO_JPEG_QUALITY = 0.8;

// Users get an API key from their provider but rarely know model ID strings.
// We pre-fill a fast, inexpensive default per provider and offer suggestions,
// so pasting a key is all that's actually required. "Test connection" validates.
const PROVIDER_MODELS = {
  openai:         { default: 'gpt-4o-mini', suggestions: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'] },
  anthropic:      { default: 'claude-haiku-4-5-20251001', suggestions: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5'] },
  gemini:         { default: 'gemini-2.5-flash-lite', suggestions: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'] },
  deepseek:       { default: 'deepseek-chat', suggestions: ['deepseek-chat', 'deepseek-reasoner'] },
  openrouter:     { default: 'google/gemini-2.5-flash-lite', suggestions: ['google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash', 'deepseek/deepseek-chat-v3.1', 'meta-llama/llama-3.1-8b-instruct'] },
  groq:           { default: 'llama-3.3-70b-versatile', suggestions: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
  mistral:        { default: 'mistral-small-latest', suggestions: ['mistral-small-latest', 'mistral-large-latest'] },
  together:       { default: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', suggestions: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'] },
  fireworks:      { default: 'accounts/fireworks/models/llama-v3p1-8b-instruct', suggestions: ['accounts/fireworks/models/llama-v3p1-8b-instruct'] },
  perplexity:     { default: 'sonar', suggestions: ['sonar', 'sonar-pro'] },
  cohere:         { default: 'command-r-plus', suggestions: ['command-r-plus', 'command-r'] },
  grok:           { default: 'grok-3-mini', suggestions: ['grok-3-mini', 'grok-3'] },
  'azure-openai': { default: '', suggestions: [] }, // deployment name is user-specific
  ollama:         { default: 'llama3.2', suggestions: ['llama3.2', 'mistral', 'qwen2.5'] },
  custom:         { default: '', suggestions: [] },
};

function isKnownDefaultModel(value) {
  return Object.values(PROVIDER_MODELS).some(m => m.default && m.default === value);
}

// Scoped to just the two free providers the quick-connect modal actually
// offers — other providers' keys either lack a distinctive prefix (Mistral,
// Together, Cohere) or are ambiguous with one another (DeepSeek/OpenAI both
// use bare "sk-"), so guessing there would risk silently selecting the
// wrong provider. Returning null just leaves the dropdown as the user set it.
function detectProviderFromApiKey(rawKey) {
  const key = (rawKey || '').trim();
  if (!key) return null;
  if (/^gsk_/.test(key)) return 'groq';
  if (/^sk-or-v1-/.test(key)) return 'openrouter';
  return null;
}

function applyModelSuggestions() {
  const provider = document.getElementById('aiProvider')?.value;
  const entry = PROVIDER_MODELS[provider];
  const modelInput = document.getElementById('aiModel');
  const datalist = document.getElementById('modelSuggestions');
  if (!entry || !modelInput || !datalist) return;

  datalist.innerHTML = '';
  entry.suggestions.forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    datalist.appendChild(opt);
  });

  // Pre-fill the default — but never clobber something the user typed themselves
  if (!modelInput.value || isKnownDefaultModel(modelInput.value)) {
    modelInput.value = entry.default;
  }

  const hint = document.getElementById('modelHint');
  if (hint) {
    hint.textContent = provider === 'azure-openai'
      ? 'Enter your Azure deployment name (found in your Azure OpenAI resource).'
      : provider === 'custom'
        ? 'Enter the model name your endpoint expects.'
        : 'We pre-filled a fast, inexpensive model — leave it as-is or pick another from the list.';
  }

  // OpenRouter's catalog is public (no key needed) — extend suggestions with
  // live cheap models so the list never goes stale.
  if (provider === 'openrouter' && !window.__openrouterModelsLoaded) {
    window.__openrouterModelsLoaded = true;
    fetch('https://openrouter.ai/api/v1/models')
      .then(r => r.json())
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        data
          .filter(m => parseFloat(m.pricing?.prompt || 1) < 0.000001) // cheap models only
          .slice(0, 30)
          .forEach(m => {
            if (![...datalist.options].some(o => o.value === m.id)) {
              const opt = document.createElement('option');
              opt.value = m.id;
              datalist.appendChild(opt);
            }
          });
      })
      .catch(() => { /* curated suggestions still work offline */ });
  }
}

let appState = {
  currentStep: 0,
  resumeStyle: 'classic',
  clStyle: 'formal',
  generatedResume: null,
  atsScore: null,
  generatedCoverLetter: null,
};

// ===== BACKEND HELPERS =====

async function callBackend(endpoint, body = null) {
  const options = {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${CONFIG.BACKEND_URL}${endpoint}`, options);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const err = new Error(errorBody.error || `Error: ${response.status}`);
    if (typeof errorBody.retryAfter === 'number') err.retryAfter = errorBody.retryAfter;
    throw err;
  }
  return await response.json();
}

async function callBackendForm(endpoint, formData) {
  const response = await fetch(`${CONFIG.BACKEND_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Error: ${response.status}`);
  }
  return await response.json();
}

function setSpinner(visible) {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = visible ? 'block' : 'none';
}

// ===== NAVIGATION =====

function goToStep(stepIndex) {
  if (stepIndex < 0 || stepIndex >= CONFIG.STEPS.length) return;
  document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const stepName = CONFIG.STEPS[stepIndex];
  document.getElementById(`step-${stepName}`).classList.add('active');
  const navBtn = document.querySelector(`.nav-btn[data-step="${stepName}"]`);
  if (navBtn) navBtn.classList.add('active');
  const stepNumberEl = document.getElementById('stepNumber');
  if (stepNumberEl) stepNumberEl.textContent = `Step ${stepIndex + 1} of ${CONFIG.STEPS.length}`;
  const progressFill = document.getElementById('progressFill');
  if (progressFill) progressFill.style.width = `${((stepIndex + 1) / CONFIG.STEPS.length) * 100}%`;
  appState.currentStep = stepIndex;
  localStorage.setItem('currentStep', stepIndex);
  updateNavCompletion();
  document.querySelector('.main-content')?.scrollTo({ top: 0 });
}

// Marks sidebar steps with a green check once their essential data exists —
// gives users a constant sense of progress (visible feedback loop)
function updateNavCompletion() {
  const done = {
    profile: !!document.getElementById('fullName')?.value,
    generate: !!(appState.generatedResume || appState.generatedCoverLetter),
  };
  Object.entries(done).forEach(([step, isDone]) => {
    document.querySelector(`.nav-btn[data-step="${step}"]`)?.classList.toggle('done', isDone);
  });
}

function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stepName = btn.dataset.step;
      const idx = CONFIG.STEPS.indexOf(stepName);
      if (idx !== -1) goToStep(idx);
      closeSidebar();
    });
  });

  // Continue / Back buttons at the bottom of each step
  document.querySelectorAll('.step-next, .step-back').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = CONFIG.STEPS.indexOf(btn.dataset.goto);
      if (idx !== -1) goToStep(idx);
    });
  });

  // Sidebar logo doubles as a "back to homepage" link — the only way back to
  // the templates gallery once a user has entered the Profile/Job/Generate flow.
  document.querySelector('.sidebar .logo')?.addEventListener('click', () => {
    closeSidebar();
    showWelcome();
  });
}

// ===== SIDEBAR (hidden-by-default overlay drawer) =====

function openSidebar() {
  document.getElementById('appSidebar')?.classList.add('open');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) backdrop.style.display = 'block';
  document.getElementById('sidebarToggleBtn')?.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  document.getElementById('appSidebar')?.classList.remove('open');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) backdrop.style.display = 'none';
  document.getElementById('sidebarToggleBtn')?.setAttribute('aria-expanded', 'false');
}

function bindSidebarToggle() {
  document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
    if (document.getElementById('appSidebar')?.classList.contains('open')) closeSidebar();
    else openSidebar();
  });
  document.getElementById('sidebarBackdrop')?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
}

// ===== DYNAMIC ENTRY LISTS (Experience / Education / Projects / Certifications) =====

function makeEntryContainer(rowsHtml) {
  const div = document.createElement('div');
  div.className = 'entry-container';
  div.innerHTML = `
    <button type="button" class="btn-remove" title="Remove">✕</button>
    ${rowsHtml}
  `;
  div.querySelector('.btn-remove').addEventListener('click', () => div.remove());
  return div;
}

function addExperienceEntry(data = {}) {
  const el = makeEntryContainer(`
    <div class="entry-row">
      <input type="text" class="form-input exp-title" placeholder="Job Title" value="${escapeAttr(data.title)}">
      <input type="text" class="form-input exp-company" placeholder="Company" value="${escapeAttr(data.company)}">
    </div>
    <div class="entry-row">
      <input type="text" class="form-input exp-start" placeholder="Start Date" value="${escapeAttr(data.startDate)}">
      <input type="text" class="form-input exp-end" placeholder="End Date (or Present)" value="${escapeAttr(data.endDate)}">
    </div>
    <div class="entry-row full">
      <textarea class="form-input exp-description" placeholder="Short role summary" rows="2">${escapeHtml(data.description)}</textarea>
    </div>
    <div class="entry-row full">
      <textarea class="form-input exp-highlights" placeholder="Achievements (one per line)" rows="3">${escapeHtml((data.highlights || []).join('\n'))}</textarea>
    </div>
  `);
  document.getElementById('experienceList').appendChild(el);
  return el;
}

function addEducationEntry(data = {}) {
  const el = makeEntryContainer(`
    <div class="entry-row">
      <input type="text" class="form-input edu-degree" placeholder="Degree" value="${escapeAttr(data.degree)}">
      <input type="text" class="form-input edu-field" placeholder="Field of Study" value="${escapeAttr(data.field)}">
    </div>
    <div class="entry-row">
      <input type="text" class="form-input edu-institution" placeholder="Institution" value="${escapeAttr(data.institution)}">
      <input type="text" class="form-input edu-year" placeholder="Year" value="${escapeAttr(data.year)}">
    </div>
  `);
  document.getElementById('educationList').appendChild(el);
  return el;
}

function addProjectEntry(data = {}) {
  const el = makeEntryContainer(`
    <div class="entry-row">
      <input type="text" class="form-input proj-name" placeholder="Project Name" value="${escapeAttr(data.name)}">
      <input type="text" class="form-input proj-link" placeholder="Link (optional)" value="${escapeAttr(data.link)}">
    </div>
    <div class="entry-row full">
      <textarea class="form-input proj-description" placeholder="Description" rows="2">${escapeHtml(data.description)}</textarea>
    </div>
  `);
  document.getElementById('projectsList').appendChild(el);
  return el;
}

function addCertEntry(data = {}) {
  const el = makeEntryContainer(`
    <div class="entry-row">
      <input type="text" class="form-input cert-name" placeholder="Certification Name" value="${escapeAttr(data.name)}">
      <input type="text" class="form-input cert-date" placeholder="Date" value="${escapeAttr(data.date)}">
    </div>
  `);
  document.getElementById('certsList').appendChild(el);
  return el;
}

// Not every skill fits the six fixed categories above — this is a free-form
// escape hatch, one blank input per click, same add/remove pattern as the
// other entry lists.
function addSkillEntry(value = '') {
  const el = makeEntryContainer(`
    <div class="entry-row full">
      <input type="text" class="form-input skill-value" placeholder="e.g. Kubernetes, Salesforce, Public speaking..." value="${escapeAttr(value)}">
    </div>
  `);
  document.getElementById('customSkillsList').appendChild(el);
  return el;
}

function escapeAttr(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Opens a full HTML document (e.g. a full-size sample resume, otherwise only
// visible as a tiny scaled-down gallery thumbnail) in a new tab for real review.
function openHtmlInNewTab(html) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clearEntryList(listId) {
  const list = document.getElementById(listId);
  if (list) list.innerHTML = '';
}

function bindAddEntryButtons() {
  document.getElementById('addExperienceBtn')?.addEventListener('click', () => addExperienceEntry());
  document.getElementById('addEducationBtn')?.addEventListener('click', () => addEducationEntry());
  document.getElementById('addProjectBtn')?.addEventListener('click', () => addProjectEntry());
  document.getElementById('addCertBtn')?.addEventListener('click', () => addCertEntry());
  document.getElementById('addSkillBtn')?.addEventListener('click', () => addSkillEntry());
}

// ===== DATA COLLECTION =====

function collectProfile() {
  const experience = [...document.querySelectorAll('#experienceList .entry-container')].map(el => ({
    title: el.querySelector('.exp-title')?.value || '',
    company: el.querySelector('.exp-company')?.value || '',
    startDate: el.querySelector('.exp-start')?.value || '',
    endDate: el.querySelector('.exp-end')?.value || '',
    description: el.querySelector('.exp-description')?.value || '',
    highlights: (el.querySelector('.exp-highlights')?.value || '').split('\n').map(s => s.trim()).filter(Boolean),
  }));

  const education = [...document.querySelectorAll('#educationList .entry-container')].map(el => ({
    degree: el.querySelector('.edu-degree')?.value || '',
    field: el.querySelector('.edu-field')?.value || '',
    institution: el.querySelector('.edu-institution')?.value || '',
    year: el.querySelector('.edu-year')?.value || '',
  }));

  const projects = [...document.querySelectorAll('#projectsList .entry-container')].map(el => ({
    name: el.querySelector('.proj-name')?.value || '',
    link: el.querySelector('.proj-link')?.value || '',
    description: el.querySelector('.proj-description')?.value || '',
  }));

  const certifications = [...document.querySelectorAll('#certsList .entry-container')].map(el => ({
    name: el.querySelector('.cert-name')?.value || '',
    date: el.querySelector('.cert-date')?.value || '',
  }));

  const customSkills = [...document.querySelectorAll('#customSkillsList .skill-value')]
    .map(input => input.value.trim())
    .filter(Boolean);

  return {
    fullName: document.getElementById('fullName')?.value || '',
    email: document.getElementById('email')?.value || '',
    phone: document.getElementById('phone')?.value || '',
    location: document.getElementById('location')?.value || '',
    linkedin: document.getElementById('linkedin')?.value || '',
    github: document.getElementById('github')?.value || '',
    summary: document.getElementById('summary')?.value || '',
    skills: [
      document.getElementById('skillLanguages')?.value || '',
      document.getElementById('skillAIML')?.value || '',
      document.getElementById('skillBackend')?.value || '',
      document.getElementById('skillCloud')?.value || '',
      document.getElementById('skillFrontend')?.value || '',
      document.getElementById('skillHumanLangs')?.value || '',
      ...customSkills,
    ].filter(Boolean).join(', '),
    experience,
    education,
    projects,
    certifications,
    photo: document.getElementById('profilePhoto')?.value || '',
  };
}

const SKILL_CATEGORY_KEYWORDS = {
  skillHumanLangs: ['english', 'german', 'french', 'spanish', 'mandarin', 'chinese', 'tamil', 'hindi', 'japanese', 'korean', 'italian', 'portuguese', 'russian', 'arabic', 'telugu', 'kannada', 'malayalam', 'bengali', 'urdu', 'dutch', 'polish', 'turkish', 'vietnamese', 'thai'],
  skillAIML: ['pytorch', 'tensorflow', 'keras', 'scikit', 'sklearn', 'langchain', 'llm', 'rag', 'nlp', 'computer vision', 'machine learning', 'deep learning', 'chromadb', 'huggingface', 'transformers', 'gpt', 'openai', 'anthropic', 'gemini', 'llama', 'mlops', 'ai '],
  skillBackend: ['fastapi', 'django', 'flask', 'node', 'express', 'spring', 'rails', '.net', 'java', 'graphql', 'rest', 'microservices', 'api', 'postgres', 'mysql', 'mongodb', 'redis', 'sql'],
  skillCloud: ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'devops', 'cloud'],
  skillFrontend: ['react', 'vue', 'angular', 'css', 'html', 'tailwind', 'bootstrap', 'next.js', 'nextjs', 'svelte', 'figma', 'ui/ux'],
};

function categorizeSkills(skillsInput) {
  const skills = Array.isArray(skillsInput)
    ? skillsInput
    : String(skillsInput || '').split(',').map(s => s.trim()).filter(Boolean);

  const buckets = { skillLanguages: [], skillAIML: [], skillBackend: [], skillCloud: [], skillFrontend: [], skillHumanLangs: [] };

  skills.forEach(skill => {
    const lower = skill.toLowerCase();
    const category = Object.keys(SKILL_CATEGORY_KEYWORDS).find(cat =>
      SKILL_CATEGORY_KEYWORDS[cat].some(kw => lower.includes(kw))
    );
    buckets[category || 'skillLanguages'].push(skill);
  });

  return buckets;
}

function populateProfile(profile) {
  document.getElementById('fullName').value = profile.fullName || '';
  document.getElementById('email').value = profile.email || '';
  document.getElementById('phone').value = profile.phone || '';
  document.getElementById('location').value = profile.location || '';
  document.getElementById('linkedin').value = profile.linkedin || '';
  document.getElementById('github').value = profile.github || '';
  document.getElementById('summary').value = profile.summary || '';

  const skillBuckets = categorizeSkills(profile.skills);
  document.getElementById('skillLanguages').value = skillBuckets.skillLanguages.join(', ');
  document.getElementById('skillAIML').value = skillBuckets.skillAIML.join(', ');
  document.getElementById('skillBackend').value = skillBuckets.skillBackend.join(', ');
  document.getElementById('skillCloud').value = skillBuckets.skillCloud.join(', ');
  document.getElementById('skillFrontend').value = skillBuckets.skillFrontend.join(', ');
  document.getElementById('skillHumanLangs').value = skillBuckets.skillHumanLangs.join(', ');
  clearEntryList('customSkillsList'); // every skill lands in one of the 6 buckets above; nothing to carry over here

  clearEntryList('experienceList');
  (profile.experience || []).forEach(exp => addExperienceEntry(exp));

  clearEntryList('educationList');
  (profile.education || []).forEach(edu => addEducationEntry(edu));

  clearEntryList('projectsList');
  (profile.projects || []).forEach(p => addProjectEntry(p));

  clearEntryList('certsList');
  (profile.certifications || []).forEach(c => addCertEntry(c));

  renderPhotoUI(profile.photo || '');
}

// Shared by populateProfile() (restoring from localStorage/parsed resume) and
// setProfilePhoto()/clearProfilePhoto() (live user action) so the thumbnail/
// remove-button visibility logic only lives in one place.
function renderPhotoUI(dataUri) {
  const thumb = document.getElementById('profilePhotoThumb');
  const hidden = document.getElementById('profilePhoto');
  const removeBtn = document.getElementById('removePhotoBtn');
  if (hidden) hidden.value = dataUri || '';
  if (thumb) {
    thumb.src = dataUri || '';
    thumb.style.display = dataUri ? '' : 'none';
  }
  if (removeBtn) removeBtn.style.display = dataUri ? '' : 'none';
}

function setProfilePhoto(dataUri) {
  renderPhotoUI(dataUri);
  updatePhotoAtsWarning();
  // No auto-save here: this app only persists to localStorage on explicit
  // action (Save profile button, or after resume-parse auto-fill) — the
  // photo rides along with that same flow once it's part of collectProfile().
}

function clearProfilePhoto() {
  renderPhotoUI('');
  const input = document.getElementById('profilePhotoInput');
  if (input) input.value = '';
  updatePhotoAtsWarning();
}

// Reads the file, downscales it on an offscreen canvas (never upscales),
// and re-encodes as JPEG — keeps localStorage and request-body payloads
// small regardless of how large the original phone photo was.
function compressImageToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image'));
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_DIM / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoFileSelect(event) {
  const file = event.target.files?.[0];
  const status = document.getElementById('photoStatus');
  if (!file) return;

  if (!PHOTO_ALLOWED_MIMES.has(file.type)) {
    if (status) { status.textContent = 'Please upload a JPEG, PNG, or WebP image.'; status.className = 'error'; }
    event.target.value = '';
    return;
  }
  if (file.size > PHOTO_MAX_RAW_BYTES) {
    if (status) { status.textContent = 'That image is too large — please use one under 5MB.'; status.className = 'error'; }
    event.target.value = '';
    return;
  }

  try {
    const dataUri = await compressImageToDataUri(file);
    if (status) { status.textContent = ''; status.className = ''; }
    setProfilePhoto(dataUri);
  } catch (error) {
    if (status) { status.textContent = "Couldn't process that image — try a different file." ; status.className = 'error'; }
    event.target.value = '';
  }
}

function bindPhotoUpload() {
  document.getElementById('profilePhotoInput')?.addEventListener('change', handlePhotoFileSelect);
  document.getElementById('removePhotoBtn')?.addEventListener('click', clearProfilePhoto);
  document.getElementById('switchToPhotoTemplateBtn')?.addEventListener('click', switchToPhotoFriendlyTemplate);
}

function collectJobDescription() {
  return {
    company: document.getElementById('jdCompany')?.value || '',
    jobTitle: document.getElementById('jdTitle')?.value || '',
    description: document.getElementById('jdText')?.value || '',
  };
}

function collectSettings() {
  const provider = document.getElementById('aiProvider')?.value || 'groq';
  return {
    provider,
    model: document.getElementById('aiModel')?.value || '',
    apiKey: document.getElementById('apiKey')?.value || '',
    baseURL: BASE_URL_PROVIDERS.includes(provider) ? (document.getElementById('customBaseURL')?.value || '') : '',
  };
}

function hasAiSettings() {
  const settings = collectSettings();
  return !!(settings.apiKey && settings.model);
}

let pendingAiAction = null;

function requireAiSettings(actionAfterConnect = null) {
  if (hasAiSettings()) return true;
  pendingAiAction = typeof actionAfterConnect === 'function' ? actionAfterConnect : null;
  showAiConnectModal();
  setQuickConnectStatus('Connect a provider key to use AI, or continue manually without AI.', '');
  return false;
}

function persistProfileAndSettings() {
  const profile = collectProfile();
  try {
    localStorage.setItem('profile', JSON.stringify(profile));
    localStorage.setItem('settings', JSON.stringify(collectSettings())); // settings/apiKey: local-only, never synced
  } catch (e) {
    // A photo-bearing profile is far more likely to hit the browser's
    // localStorage quota than the all-text profile this used to always be —
    // surface that clearly instead of letting it fail silently mid-save.
    alert('Profile is too large to save locally — try removing the photo or shortening some entries.');
  }
  updateNavCompletion();
}

function restoreProfileAndSettings() {
  try {
    const savedProfile = JSON.parse(localStorage.getItem('profile') || 'null');
    if (savedProfile) populateProfile(savedProfile);
  } catch (e) { /* ignore malformed saved data */ }

  try {
    const savedSettings = JSON.parse(localStorage.getItem('settings') || 'null');
    if (savedSettings) {
      if (savedSettings.provider) document.getElementById('aiProvider').value = savedSettings.provider;
      if (savedSettings.model) document.getElementById('aiModel').value = savedSettings.model;
      if (savedSettings.apiKey) document.getElementById('apiKey').value = savedSettings.apiKey;
      if (savedSettings.baseURL) document.getElementById('customBaseURL').value = savedSettings.baseURL;
      toggleCustomBaseURLSection();
    }
  } catch (e) { /* ignore malformed saved data */ }

  refreshApiStatus();
}

// ===== SETTINGS =====

function toggleCustomBaseURLSection() {
  const provider = document.getElementById('aiProvider')?.value;
  const section = document.getElementById('customBaseURLSection');
  if (section) section.style.display = BASE_URL_PROVIDERS.includes(provider) ? 'block' : 'none';
}

function setApiStatus(state, text) {
  const dot = document.getElementById('apiStatusIndicator');
  const label = document.getElementById('apiStatusText');
  if (dot) dot.className = `status-dot ${state}`;
  if (label) label.textContent = text;
}

// Reflects whatever is currently in the provider/model/key fields — called on
// load, on save, and as the user types, so the sidebar never lags behind reality.
function refreshApiStatus() {
  const settings = collectSettings();
  if (settings.apiKey && settings.model) {
    setApiStatus('connected', 'AI connected');
  } else {
    setApiStatus('', 'AI not connected');
  }
}

async function testApiKey() {
  const settings = collectSettings();
  if (!settings.apiKey || !settings.model) {
    alert('Please enter a provider, model, and API key first.');
    return;
  }

  const btn = document.getElementById('testApiBtn');
  btn.disabled = true;
  setApiStatus('', 'Testing...');

  try {
    await callBackend('/resumes/test-key', settings);
    setApiStatus('connected', 'Key verified');
  } catch (error) {
    setApiStatus('error', error.message || 'Key test failed');
  } finally {
    btn.disabled = false;
  }
}

function saveSettings() {
  persistProfileAndSettings();
  refreshApiStatus();
  const status = document.getElementById('settingsStatus');
  if (status) {
    status.textContent = 'Settings saved.';
    status.className = 'success';
  }
}

function saveProfile() {
  persistProfileAndSettings();
  const status = document.getElementById('saveStatus');
  if (status) {
    status.textContent = 'Profile saved.';
    status.className = 'success';
  }
}

// ===== RESUME UPLOAD & PARSE =====

function currentParseCredentials() {
  const settings = collectSettings();
  if (settings.apiKey && settings.model) return settings;
  return {
    provider: document.getElementById('parseProvider')?.value || 'openrouter',
    model: document.getElementById('parseModel')?.value || '',
    apiKey: document.getElementById('parseApiKey')?.value || '',
  };
}

async function parseResume() {
  const fileInput = document.getElementById('resumeUploadInput');
  const file = fileInput?.files?.[0];
  const status = document.getElementById('parseStatus');

  if (!file) {
    alert('Choose a resume file first (PDF, DOCX, TXT, or MD).');
    return;
  }

  const creds = currentParseCredentials();
  if (!creds.apiKey || !creds.model) {
    requireAiSettings(parseResume);
    if (status) { status.textContent = 'Connect your AI key to parse this resume, or fill the profile manually below.'; status.className = 'error'; }
    return;
  }

  const btn = document.getElementById('parseResumeBtn');
  btn.disabled = true;
  if (status) { status.textContent = 'Uploading and parsing...'; status.className = ''; }

  try {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('provider', creds.provider);
    formData.append('model', creds.model);
    formData.append('apiKey', creds.apiKey);
    if (creds.baseURL) formData.append('baseURL', creds.baseURL);

    const result = await callBackendForm('/resumes/parse', formData);
    populateProfile(result.profile);
    persistProfileAndSettings();
    if (status) { status.textContent = 'Resume parsed — review the fields below and edit as needed.'; status.className = 'success'; }
  } catch (error) {
    if (status) { status.textContent = 'Parse failed: ' + error.message; status.className = 'error'; }
  } finally {
    btn.disabled = false;
  }
}

// ===== JOB DESCRIPTION ANALYSIS =====

async function analyzeJD() {
  const jd = collectJobDescription();
  if (!jd.description) {
    alert('Paste a job description first.');
    return;
  }

  const resultsEl = document.getElementById('keywordResults');
  try {
    const result = await callBackend('/resumes/analyze-jd', { jobDescription: jd.description });
    if (resultsEl) {
      resultsEl.innerHTML = `
        <strong>Keywords found:</strong> ${result.keywords.length ? result.keywords.join(', ') : 'none detected'}<br>
        <strong>Requirements:</strong> ${result.requirements.length ? '<ul>' + result.requirements.map(r => `<li>${escapeHtml(r)}</li>`).join('') + '</ul>' : 'none detected'}
      `;
    }
  } catch (error) {
    if (resultsEl) resultsEl.textContent = 'Analysis failed: ' + error.message;
  }
}

// ===== TEMPLATE SELECTORS (writing style cards) =====

function bindStyleCards() {
  document.querySelectorAll('#resumeSelector .template-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#resumeSelector .template-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      appState.resumeStyle = card.dataset.type;
    });
  });

  document.querySelectorAll('#clSelector .template-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#clSelector .template-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      appState.clStyle = card.dataset.type;
    });
  });

  // Default the first card of each selector to selected
  document.querySelector('#resumeSelector .template-card')?.classList.add('selected');
  document.querySelector('#clSelector .template-card')?.classList.add('selected');
}

// ===== ATS SCORE =====
// All scoring happens server-side (server/utils/ats-scorer.js) — deterministic
// keyword matching, no AI call, so these are free/instant regardless of
// whether the user has an API key configured yet.

function atsScoreColor(score) {
  return score >= 70 ? '#1a7a43' : score >= 40 ? '#b8860b' : '#c0392b';
}

// Renders into the fixed badge+detail+list elements on the Generate step's
// result card, after an actual resume has been generated.
function renderATSScore(result) {
  const badge = document.getElementById('atsScoreBadge');
  const detail = document.getElementById('atsScoreDetail');
  const recs = document.getElementById('atsScoreRecommendations');
  if (!result) {
    if (badge) badge.textContent = '';
    if (detail) detail.textContent = '';
    if (recs) recs.innerHTML = '';
    return;
  }

  const total = result.matchedKeywords.length + result.missingKeywords.length;

  if (badge) {
    badge.textContent = result.score + '% ATS match';
    badge.style.background = atsScoreColor(result.score);
    badge.style.color = '#fff';
  }

  if (detail) {
    const missing = result.missingKeywords.slice(0, 8).join(', ');
    detail.textContent = total
      ? `${result.matchedKeywords.length} of ${total} job-description keywords found in your resume.` +
        (missing ? ` Consider adding: ${missing}.` : '')
      : '';
  }

  if (recs) {
    recs.innerHTML = result.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('');
  }
}

// ===== GENERATE / PREVIEW / DOWNLOAD: RESUME =====

// Shared tail for both the AI-generated and manually-built resume paths —
// same result shape ({ resumeContent, atsScore, matchedKeywords,
// missingKeywords, recommendations }) either way, so everything from here
// on (reveal the editor, populate fields, preview) doesn't care which path
// produced it.
async function applyGeneratedResume(result) {
  appState.generatedResume = result.resumeContent;
  appState.atsScore = result.atsScore;
  updateNavCompletion();

  // .result-card / .ats-card are `display: flex` in CSS — an inline
  // 'block' here would override the stylesheet (inline styles win over
  // class rules) and silently break the flex-column stacking, leaving
  // textareas at browser-default intrinsic width instead of full-width.
  document.getElementById('resumeEditor').style.display = 'flex';
  // No JD was provided, so there's nothing to score an ATS match against —
  // hide the card instead of showing a misleading "0% match".
  const atsMatchEl = document.getElementById('resumeAtsMatch');
  if (result.atsScore === null) {
    atsMatchEl.style.display = 'none';
    renderATSScore(null);
  } else {
    atsMatchEl.style.display = 'flex';
    renderATSScore({
      score: result.atsScore,
      matchedKeywords: result.matchedKeywords || [],
      missingKeywords: result.missingKeywords || [],
      recommendations: result.recommendations || [],
    });
  }

  document.getElementById('editSummary').value = result.resumeContent.tailoredSummary || '';
  document.getElementById('editSkills').value = (result.resumeContent.tailoredSkills || []).join(', ');

  switchPreviewTab('resume');
  await previewResume();
}

async function generateResume() {
  const profile = collectProfile();
  const jd = collectJobDescription();
  const settings = collectSettings();

  if (!profile.fullName) { alert('Please fill in your name in the Profile step'); return; }
  if (!settings.apiKey || !settings.model) { requireAiSettings(generateResume); return; }

  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  setSpinner(true);

  try {
    const result = await callBackend('/resumes', {
      profile,
      jobDescription: jd.description,
      company: jd.company,
      jobTitle: jd.jobTitle,
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseURL: settings.baseURL,
      resumeType: appState.resumeStyle,
    });

    await applyGeneratedResume(result);
  } catch (error) {
    alert('Resume generation failed: ' + error.message);
  } finally {
    btn.disabled = false;
    setSpinner(false);
  }
}

// ===== MANUAL (NO-AI) RESUME BUILD =====
// Every "tailored" field the AI would produce already exists verbatim in
// the user's profile -- rewording bullets/summary is the AI's actual value
// add, not a requirement to produce a valid resume at all. This maps
// profile data directly into the same resumeContent shape the AI path
// produces, so everything downstream (preview, edit fields, PDF) treats it
// identically.
function buildManualResumeContent(profile) {
  const tailoredExperience = (profile.experience || []).map(exp => ({
    company: exp.company || '',
    title: exp.title || '',
    duration: [exp.startDate, exp.endDate].filter(Boolean).join(' - '),
    achievements: exp.highlights || [],
  }));

  const tailoredEducation = (profile.education || []).map(edu => ({
    degree: edu.degree || '',
    field: edu.field || '',
    institution: edu.institution || '',
    year: edu.year || '',
  }));

  const tailoredCertifications = (profile.certifications || []).map(cert => ({
    name: cert.name || '',
    date: cert.date || '',
  }));

  const tailoredSkills = String(profile.skills || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  return {
    tailoredSummary: profile.summary || '',
    tailoredExperience,
    tailoredSkills,
    tailoredEducation,
    tailoredCertifications,
  };
}

async function buildManualResume() {
  const profile = collectProfile();
  const jd = collectJobDescription();

  if (!profile.fullName) { alert('Please fill in your name in the Profile step'); return; }

  const btn = document.getElementById('buildManualBtn');
  btn.disabled = true;

  try {
    const resumeContent = buildManualResumeContent(profile);

    let result = { resumeContent, atsScore: null, matchedKeywords: [], missingKeywords: [], recommendations: [] };
    if (jd.description) {
      // Free, no-AI keyword match — same endpoint recheckResumeATSScore() uses.
      // Note: this endpoint returns { score, ... } (not { atsScore, ... }) —
      // remap it to the shape applyGeneratedResume()/the /resumes route use.
      const atsResult = await callBackend('/resumes/ats-score', { resumeContent, jobDescription: jd.description });
      result = {
        resumeContent,
        atsScore: atsResult.score,
        matchedKeywords: atsResult.matchedKeywords || [],
        missingKeywords: atsResult.missingKeywords || [],
        recommendations: atsResult.recommendations || [],
      };
    }

    await applyGeneratedResume(result);
  } catch (error) {
    alert('Resume build failed: ' + error.message);
  } finally {
    btn.disabled = false;
  }
}

// Free, no-AI re-check: scores whatever is CURRENTLY in the edit fields (the
// user may have hand-edited the tailored summary/skills since generation)
// against the JD. Lets someone verify their edits didn't hurt the match
// without spending another AI call.
async function recheckResumeATSScore() {
  if (!appState.generatedResume) return;
  const jd = collectJobDescription();
  if (!jd.description) { alert('Paste a job description in the Job step first.'); return; }

  const btn = document.getElementById('recheckAtsBtn');
  if (btn) btn.disabled = true;

  try {
    const editedSkills = (document.getElementById('editSkills')?.value || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const currentResumeContent = {
      ...appState.generatedResume,
      tailoredSummary: document.getElementById('editSummary')?.value || appState.generatedResume.tailoredSummary,
      tailoredSkills: editedSkills.length ? editedSkills : appState.generatedResume.tailoredSkills,
    };

    const result = await callBackend('/resumes/ats-score', {
      resumeContent: currentResumeContent,
      jobDescription: jd.description,
    });

    appState.atsScore = result.score;
    renderATSScore(result);
  } catch (error) {
    alert('ATS recheck failed: ' + error.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function previewResume() {
  if (!appState.generatedResume) { alert('Generate a resume first'); return; }

  const profile = collectProfile();
  const templateId = document.getElementById('resumeTemplateId')?.value;
  if (!templateId) { alert('No visual templates loaded yet — check your connection to the server.'); return; }

  try {
    const result = await callBackend('/resumes/preview', {
      resumeContent: appState.generatedResume,
      templateId,
      includePhoto: !!profile.photo,
      profile,
    });

    setPreview('resume', result.html);
  } catch (error) {
    alert('Preview failed: ' + error.message);
  }
}

async function downloadResumePDF() {
  if (!requireEmail(downloadResumePDF)) return;
  syncPreviewEdits(); // carry any in-progress preview edits into the PDF
  if (!window._previewHtml) { alert('Please preview the resume first'); return; }
  await downloadPDF(window._previewHtml, 'resume.pdf');
}

// ===== GENERATE / PREVIEW / DOWNLOAD: COVER LETTER =====

async function generateCoverLetter() {
  const profile = collectProfile();
  const jd = collectJobDescription();
  const settings = collectSettings();

  if (!profile.fullName || !jd.description) {
    alert('Please fill in Profile and Job Description first.');
    return;
  }
  if (!settings.apiKey || !settings.model) {
    requireAiSettings(generateCoverLetter);
    return;
  }

  const btn = document.getElementById('generateCLBtn');
  btn.disabled = true;
  setSpinner(true);

  try {
    const result = await callBackend('/coverletters', {
      profile,
      jobDescription: jd.description,
      company: jd.company,
      jobTitle: jd.jobTitle,
      tone: appState.clStyle,
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseURL: settings.baseURL,
    });

    appState.generatedCoverLetter = result.coverLetterContent;
    updateNavCompletion();
    document.getElementById('clEditor').style.display = 'flex'; // .result-card is display:flex — see note above

    switchPreviewTab('coverletter');
    await previewCoverLetter();
  } catch (error) {
    alert('Cover letter generation failed: ' + error.message);
  } finally {
    btn.disabled = false;
    setSpinner(false);
  }
}

async function previewCoverLetter() {
  if (!appState.generatedCoverLetter) { alert('Generate a cover letter first'); return; }

  const profile = collectProfile();
  const jd = collectJobDescription();
  const templateId = document.getElementById('clTemplateId')?.value;
  if (!templateId) { alert('No visual templates loaded yet — check your connection to the server.'); return; }

  try {
    const result = await callBackend('/coverletters/preview', {
      coverLetterContent: appState.generatedCoverLetter,
      templateId,
      profile,
      jd,
    });

    setPreview('coverletter', result.html);
  } catch (error) {
    alert('Preview failed: ' + error.message);
  }
}

async function downloadCoverLetterPDF() {
  if (!requireEmail(downloadCoverLetterPDF)) return;
  syncPreviewEdits(); // carry any in-progress preview edits into the PDF
  if (!window._clPreviewHtml) { alert('Please preview the cover letter first'); return; }
  await downloadPDF(window._clPreviewHtml, 'cover-letter.pdf');
}

// ===== SHARED PREVIEW / PDF HELPERS =====

// Tracks whether the currently-cached HTML for each tab is real generated
// output or just the placeholder sample loaded before the user has generated
// anything — controls the "Sample preview" badge in updateSampleBadge().
const previewIsSample = { resume: false, coverletter: false };

function updateSampleBadge() {
  const badge = document.getElementById('previewSampleBadge');
  if (badge) badge.style.display = previewIsSample[activePreviewKind()] ? '' : 'none';
}

function setPreview(kind, html) {
  if (kind === 'resume') window._previewHtml = html;
  else window._clPreviewHtml = html;
  previewIsSample[kind] = false;

  const hint = document.getElementById('previewHint');
  if (hint) hint.style.display = 'none';
  const editBtn = document.getElementById('previewEditBtn');
  if (editBtn) editBtn.style.display = '';
  const expandBtn = document.getElementById('previewExpandBtn');
  if (expandBtn) expandBtn.style.display = '';

  const activeTab = document.querySelector('.preview-tab.active')?.dataset.preview || 'resume';
  if (activeTab === kind) {
    const iframe = document.getElementById('previewIframe');
    if (iframe) iframe.srcdoc = html;
    updateSampleBadge();
  }

  // On narrow viewports the preview pane stacks below the form instead of
  // sitting in its own sticky column, so it's off-screen unless we scroll to
  // it. 'nearest' is a no-op when it's already fully visible (desktop).
  document.getElementById('previewSidebar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== EDITABLE PREVIEW =====
// The iframe is sandboxed with allow-same-origin only (scripts stay blocked, so
// injected HTML can't run JS) — which lets us flip the document contenteditable
// and read the user's edits back for the PDF. Native browser API, no library.

function activePreviewKind() {
  return document.querySelector('.preview-tab.active')?.dataset.preview || 'resume';
}

// Persist whatever the user changed in the live preview back into the HTML we
// send to the PDF endpoint. Called on Edit-off, tab switch, and download.
function syncPreviewEdits() {
  const iframe = document.getElementById('previewIframe');
  if (!iframe) return;
  let doc;
  try { doc = iframe.contentDocument; } catch (e) { return; }
  if (!doc || !doc.body || !iframe.srcdoc) return;

  const edited = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  if (activePreviewKind() === 'resume') window._previewHtml = edited;
  else window._clPreviewHtml = edited;
}

function setPreviewEditing(on) {
  const iframe = document.getElementById('previewIframe');
  const editBtn = document.getElementById('previewEditBtn');
  const editHint = document.getElementById('previewEditHint');
  let doc;
  try { doc = iframe?.contentDocument; } catch (e) { return; }
  if (!doc || !doc.body) return;

  doc.body.contentEditable = on ? 'true' : 'false';
  iframe.classList.toggle('editing', on);
  if (editBtn) {
    editBtn.classList.toggle('editing', on);
    editBtn.innerHTML = on
      ? 'Done editing'
      : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> Edit';
  }
  if (editHint) editHint.style.display = on ? '' : 'none';
  if (on) doc.body.focus();
  else syncPreviewEdits();
}

function isPreviewEditing() {
  const iframe = document.getElementById('previewIframe');
  try { return iframe?.contentDocument?.body?.contentEditable === 'true'; } catch (e) { return false; }
}

function bindPreviewEditing() {
  document.getElementById('previewEditBtn')?.addEventListener('click', () => {
    setPreviewEditing(!isPreviewEditing());
  });
}

// ===== FULL-SCREEN PREVIEW =====
// "View" expands the preview pane over the whole viewport; Edit and
// "Update your details" stay reachable in its top-right corner throughout.

function setPreviewFullscreen(on) {
  document.getElementById('previewSidebar')?.classList.toggle('fullscreen', on);
  const expandBtn = document.getElementById('previewExpandBtn');
  const updateBtn = document.getElementById('updateDetailsBtn');
  const closeBtn = document.getElementById('previewCloseBtn');
  if (expandBtn) expandBtn.style.display = on ? 'none' : '';
  if (updateBtn) updateBtn.style.display = on ? '' : 'none';
  if (closeBtn) closeBtn.style.display = on ? '' : 'none';
}

function bindPreviewFullscreen() {
  document.getElementById('previewExpandBtn')?.addEventListener('click', () => setPreviewFullscreen(true));
  document.getElementById('previewCloseBtn')?.addEventListener('click', () => setPreviewFullscreen(false));
  document.getElementById('updateDetailsBtn')?.addEventListener('click', () => {
    setPreviewFullscreen(false);
    goToStep(CONFIG.STEPS.indexOf('profile'));
  });
}

// Switches the active tab's highlighting and syncs/disables editing, without
// touching the iframe. Used right before a fresh preview render is about to
// overwrite it anyway, so we don't flash stale/empty content first.
function switchPreviewTab(kind) {
  syncPreviewEdits(); // keep edits made on the tab we're leaving
  setPreviewEditing(false);
  document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.preview-tab[data-preview="${kind}"]`)?.classList.add('active');
}

// Switches the preview pane to the given kind ('resume' | 'coverletter') and
// loads whatever HTML is already cached for it. Used by the tab click handler,
// where there's no fresh render about to follow.
function activatePreviewTab(kind) {
  switchPreviewTab(kind);
  const html = kind === 'resume' ? window._previewHtml : window._clPreviewHtml;
  const iframe = document.getElementById('previewIframe');
  if (iframe) iframe.srcdoc = html || '';
  updateSampleBadge();
}

function bindPreviewTabs() {
  document.querySelectorAll('.preview-tab').forEach(tab => {
    tab.addEventListener('click', () => activatePreviewTab(tab.dataset.preview));
  });
}

// ===== DRAGGABLE PREVIEW RESIZER =====
function initPreviewResizer() {
  const resizer = document.getElementById('previewResizer');
  const container = document.getElementById('app');
  if (!resizer || !container) return;

  const saved = localStorage.getItem('previewWidth');
  if (saved) container.style.setProperty('--preview-w', saved + 'px');

  let dragging = false;

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    resizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    // Preview pane is the rightmost column, so its width is the cursor's
    // distance from the right edge of the window.
    const width = Math.min(Math.max(window.innerWidth - e.clientX, 300), Math.round(window.innerWidth * 0.6));
    container.style.setProperty('--preview-w', width + 'px');
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    const current = getComputedStyle(container).getPropertyValue('--preview-w').trim();
    if (current) localStorage.setItem('previewWidth', parseInt(current, 10));
  });
}

async function downloadPDF(html, filename) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL.replace('/api', '')}/api/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || errorBody.error || `PDF generation failed (${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert('Download failed: ' + error.message);
  }
}

// ===== TEMPLATE LOADING (visual templates) =====

// Populated by loadTemplates() — keyed by template id, used by
// updatePhotoAtsWarning() to check a template's supports_photo flag without
// a extra round-trip.
let resumeTemplateMeta = {};

async function loadTemplates() {
  try {
    const resumeResp = await callBackend('/templates/resume');
    const clResp = await callBackend('/templates/cover-letter');

    const resumeSelect = document.getElementById('resumeTemplateId');
    if (resumeSelect) {
      resumeResp.templates.forEach(t => { resumeTemplateMeta[t.id] = t; });
      // ATS-Friendly first — same recommended-default ordering as the gallery.
      [...resumeResp.templates].sort(byCategoryOrder).forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.name;
        resumeSelect.appendChild(option);
      });
      // Landing-page gallery may have set this before the app was even shown
      const preferred = localStorage.getItem('preferredResumeTemplateId');
      if (preferred && [...resumeSelect.options].some(o => o.value === preferred)) {
        resumeSelect.value = preferred;
      }
    }

    const clSelect = document.getElementById('clTemplateId');
    if (clSelect) {
      clResp.templates.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.name;
        clSelect.appendChild(option);
      });
    }

    // Once real template options exist, fill the (otherwise empty) preview
    // pane with sample output so it isn't just blank on first load.
    loadPreviewSample('resume');
    loadPreviewSample('coverletter');
    resumeSelect?.addEventListener('change', () => { loadPreviewSample('resume'); updatePhotoAtsWarning(); });
    clSelect?.addEventListener('change', () => loadPreviewSample('coverletter'));
    // Covers the case where a photo was already restored from localStorage
    // (via populateProfile(), which runs before this resolves) — re-check
    // now that resumeTemplateMeta is actually populated.
    updatePhotoAtsWarning();
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

// Shows/hides the "this template won't render a photo" note based on the
// currently selected resume template's supports_photo metadata flag.
function updatePhotoAtsWarning() {
  const warning = document.getElementById('photoAtsWarning');
  if (!warning) return;
  const hasPhoto = !!document.getElementById('profilePhoto')?.value;
  const templateId = document.getElementById('resumeTemplateId')?.value;
  const meta = templateId ? resumeTemplateMeta[templateId] : null;
  warning.style.display = (hasPhoto && meta && meta.supports_photo === false) ? '' : 'none';
}

// Jumps to the first photo-capable template instead of just telling the user
// their current pick doesn't support one — the warning alone was a dead end,
// since the default-selected template (ATS-Friendly sorts first) never
// supports photos, so most people who upload one see this immediately.
function switchToPhotoFriendlyTemplate() {
  const select = document.getElementById('resumeTemplateId');
  if (!select) return;
  const target = Object.values(resumeTemplateMeta).find(t => t.supports_photo === true);
  if (!target) return;
  select.value = target.id;
  select.dispatchEvent(new Event('change'));
}

// Loads a placeholder resume/cover letter into the preview pane before the
// user has generated anything real — no AI call, just the same sample data
// the landing-page gallery uses. Never overwrites real generated output.
async function loadPreviewSample(kind) {
  const alreadyGenerated = kind === 'resume' ? appState.generatedResume : appState.generatedCoverLetter;
  if (alreadyGenerated) return;

  const templateId = kind === 'resume'
    ? document.getElementById('resumeTemplateId')?.value
    : document.getElementById('clTemplateId')?.value;
  if (!templateId) return;

  try {
    const endpoint = kind === 'resume' ? `/templates/resume/${templateId}/sample` : `/templates/cover-letter/${templateId}/sample`;
    const { html } = await callBackend(endpoint);

    if (kind === 'resume') window._previewHtml = html;
    else window._clPreviewHtml = html;
    previewIsSample[kind] = true;

    const hint = document.getElementById('previewHint');
    if (hint) hint.style.display = 'none';

    if (activePreviewKind() === kind) {
      const iframe = document.getElementById('previewIframe');
      if (iframe) iframe.srcdoc = html;
      updateSampleBadge();
    }
  } catch (error) {
    console.error(`Failed to load ${kind} preview sample:`, error);
  }
}

// ===== LANDING PAGE: TEMPLATE GALLERY =====
// Renders every real, working resume template with a sample profile so
// visitors see actual designs before deciding how to start. Category filter
// tabs (All / ATS-Friendly / Modern & Creative / ...) mirror the pattern
// bettercv.com uses on its template-picker — same idea, but built off the
// category each template.meta.json already carries, so no new data needed.

// ATS-Friendly leads — it's the safe, recommended default for actual job
// applications; the rest are "browse if you want something else" follow-ups.
// Shared by the gallery card order, the filter-tab order, and the Generate
// step's template <select> default.
const CATEGORY_ORDER = ['ATS-Friendly', 'Professional & Business', 'Modern & Creative', 'Specialized'];

function byCategoryOrder(a, b) {
  const ai = CATEGORY_ORDER.indexOf(a.category ?? a);
  const bi = CATEGORY_ORDER.indexOf(b.category ?? b);
  return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi);
}

let galleryCards = []; // cached after first load so filtering doesn't re-fetch

async function loadTemplateGallery() {
  const gallery = document.getElementById('templateGallery');
  if (!gallery || gallery.dataset.loaded) return;
  gallery.dataset.loaded = '1';

  try {
    const { templates } = await callBackend('/templates/resume');
    const cards = await Promise.all(templates.map(async (t) => {
      try {
        const sample = await callBackend(`/templates/resume/${t.id}/sample`);
        return { template: t, sample };
      } catch (e) {
        return null; // no sample available for this one — skip it, don't break the gallery
      }
    }));
    galleryCards = cards.filter(Boolean).sort((a, b) => byCategoryOrder(a.template, b.template));

    renderGalleryFilterTabs();
    renderGalleryCards('all');
  } catch (error) {
    gallery.innerHTML = '<p class="gallery-loading">Couldn\'t load templates — try "Create from scratch" instead.</p>';
    console.error('Failed to load template gallery:', error);
  }
}

function renderGalleryFilterTabs() {
  const tabsEl = document.getElementById('galleryFilterTabs');
  if (!tabsEl) return;

  // Preserve a sensible fixed order rather than whatever order categories
  // happen to appear in on disk.
  const present = new Set(galleryCards.map(c => c.template.category));
  const categories = CATEGORY_ORDER.filter(c => present.has(c));

  tabsEl.innerHTML = ['all', ...categories].map(cat => `
    <button type="button" class="gallery-filter-tab${cat === 'all' ? ' active' : ''}" data-category="${escapeAttr(cat)}">
      ${cat === 'all' ? 'All templates' : escapeHtml(cat)}
    </button>
  `).join('');

  tabsEl.querySelectorAll('.gallery-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabsEl.querySelectorAll('.gallery-filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGalleryCards(tab.dataset.category);
    });
  });
}

function renderGalleryCards(category) {
  const gallery = document.getElementById('templateGallery');
  if (!gallery) return;

  const visible = category === 'all' ? galleryCards : galleryCards.filter(c => c.template.category === category);

  gallery.innerHTML = visible.map(({ template, sample }) => `
    <div class="template-gallery-card" data-template-id="${escapeAttr(template.id)}">
      <button type="button" class="gallery-thumb view-full-sample-btn" title="View full-size resume" aria-label="View full-size ${escapeAttr(template.name)} resume">
        <iframe srcdoc="${escapeAttr(sample.html)}" tabindex="-1" aria-hidden="true"></iframe>
        <span class="gallery-thumb-overlay">View full resume</span>
      </button>
      <div class="gallery-info">
        <h3>${escapeHtml(template.name)}</h3>
        <p class="gallery-persona">${escapeHtml(sample.persona.name)} — ${escapeHtml(sample.persona.label)}</p>
        <div class="button-group">
          <button type="button" class="btn btn-secondary btn-small view-full-sample-btn">View full resume</button>
          <button type="button" class="btn btn-primary btn-small use-manual-btn">Edit manually</button>
          <button type="button" class="btn btn-secondary btn-small use-ai-btn">Edit with AI</button>
        </div>
      </div>
    </div>
  `).join('') || '<p class="gallery-loading">No templates in this category yet.</p>';

  gallery.querySelectorAll('.use-manual-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.template-gallery-card');
      useTemplateFromGallery(card.dataset.templateId, 'manual');
    });
  });

  gallery.querySelectorAll('.use-ai-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.template-gallery-card');
      useTemplateFromGallery(card.dataset.templateId, 'ai');
    });
  });

  // Thumbnails are scaled to ~28% to fit the card — unreadable at that size,
  // so both the thumbnail itself and an explicit button open the real,
  // full-size sample resume in a new tab for actual review.
  gallery.querySelectorAll('.view-full-sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const templateId = btn.closest('.template-gallery-card').dataset.templateId;
      const card = galleryCards.find(c => c.template.id === templateId);
      if (card) openHtmlInNewTab(card.sample.html);
    });
  });
}

function useTemplateFromGallery(templateId, mode = 'manual') {
  localStorage.setItem('preferredResumeTemplateId', templateId);

  if (mode === 'ai' && !requireAiSettings(() => {
    dismissWelcome();
    updateNavCompletion();
    goToStep(0);
  })) {
    return;
  }

  dismissWelcome();
  updateNavCompletion();
  goToStep(0); // Your Profile
}

function bindWelcomeChoice() {
  const buttons = document.querySelectorAll('.welcome-choice');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const showTemplates = btn.dataset.choice === 'templates';
      document.getElementById('welcomeTemplatesPanel').style.display = showTemplates ? '' : 'none';
      document.getElementById('welcomeScratchPanel').style.display = showTemplates ? 'none' : '';
      if (showTemplates) loadTemplateGallery();
    });
  });
}

// ===== QUICK AI CONNECT (shown only when an AI action needs a key) =====
// Gives users a guided path to connect a provider key without making AI setup
// the first thing every visitor has to do.
// Writes straight into the real #aiProvider/#aiModel/#apiKey fields so every
// existing function (collectSettings, testApiKey, generateResume...) just
// works — this is a fast-path into the same settings the full AI settings
// modal edits (see below), not a separate parallel system.

function showAiConnectModal() {
  const modal = document.getElementById('aiConnectModal');
  if (modal) modal.style.display = 'flex';
}

function hideAiConnectModal() {
  const modal = document.getElementById('aiConnectModal');
  if (modal) modal.style.display = 'none';
}

function setQuickConnectStatus(text, kind) {
  const el = document.getElementById('quickConnectStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--ink-soft)';
}

function bindAiConnectModal() {
  const btn = document.getElementById('quickConnectBtn');
  document.getElementById('quickManualBtn')?.addEventListener('click', () => {
    pendingAiAction = null;
    hideAiConnectModal();
  });

  document.getElementById('quickApiKey')?.addEventListener('input', (e) => {
    const detected = detectProviderFromApiKey(e.target.value);
    const hint = document.getElementById('quickProviderHint');
    if (!detected) { if (hint) hint.textContent = ''; return; }
    const select = document.getElementById('quickAiProvider');
    const option = select && [...select.options].find(o => o.value === detected);
    if (!option) { if (hint) hint.textContent = ''; return; }
    select.value = detected;
    if (hint) hint.textContent = `Detected: ${option.textContent} — provider selected automatically.`;
  });

  btn?.addEventListener('click', async () => {
    const provider = document.getElementById('quickAiProvider')?.value || 'openrouter';
    const apiKey = document.getElementById('quickApiKey')?.value.trim() || '';

    if (!apiKey) {
      setQuickConnectStatus('Paste an API key first.', 'error');
      return;
    }

    document.getElementById('aiProvider').value = provider;
    applyModelSuggestions(); // fills #aiModel with the right default for this provider
    document.getElementById('apiKey').value = apiKey;

    btn.disabled = true;
    setQuickConnectStatus('Verifying your key…', '');

    try {
      await callBackend('/resumes/test-key', collectSettings());
      persistProfileAndSettings();
      refreshApiStatus();
      setQuickConnectStatus('Connected!', 'success');
      const next = pendingAiAction;
      pendingAiAction = null;
      setTimeout(() => {
        hideAiConnectModal();
        if (next) next();
      }, 600); // brief green confirmation before closing
    } catch (error) {
      setQuickConnectStatus(error.message || 'Could not verify that key — check it and try again.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

// ===== EMAIL GATE (shown once, before the first download) =====
// Same lazy-gate shape as requireAiSettings()/pendingAiAction above: check a
// condition, and if it's not met, defer the caller's action until the user
// completes the modal. The email itself is saved to localStorage (so a
// returning visitor is never re-asked) and sent to POST /api/leads, which
// appends it to a Google Sheet — best-effort; a backend/config issue there
// never blocks the user's actual download.

function hasEmail() {
  return !!localStorage.getItem('userEmail');
}

let pendingEmailAction = null;

function requireEmail(actionAfterEmail = null) {
  if (hasEmail()) return true;
  pendingEmailAction = typeof actionAfterEmail === 'function' ? actionAfterEmail : null;
  showEmailGateModal();
  return false;
}

function showEmailGateModal() {
  const modal = document.getElementById('emailGateModal');
  if (modal) modal.style.display = 'flex';
  const status = document.getElementById('gateEmailStatus');
  if (status) { status.textContent = ''; status.className = ''; }
}

function hideEmailGateModal() {
  const modal = document.getElementById('emailGateModal');
  if (modal) modal.style.display = 'none';
}

function bindEmailGate() {
  document.getElementById('gateEmailCancelBtn')?.addEventListener('click', () => {
    pendingEmailAction = null; // cancel never runs the pending download
    hideEmailGateModal();
  });

  document.getElementById('gateEmailSubmitBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('gateEmailInput');
    const status = document.getElementById('gateEmailStatus');
    const email = (input?.value || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (status) { status.textContent = 'Enter a valid email address.'; status.className = 'error'; }
      return;
    }

    localStorage.setItem('userEmail', email);

    // Best-effort — a failure here (misconfigured sheet, network hiccup)
    // never blocks the download the user actually came for.
    try {
      await callBackend('/leads', { email });
    } catch (error) {
      console.error('[Leads] Failed to save email:', error.message);
    }

    const next = pendingEmailAction;
    pendingEmailAction = null;
    hideEmailGateModal();
    if (next) next();
  });
}

// ===== FULL AI SETTINGS MODAL (all providers) =====
// Opened from the sidebar's "Change AI provider" link — this is where a user
// switches away from the quick-connect modal's OpenRouter/Groq-only choice to
// any other provider. Writes into the same #aiProvider/#aiModel/#apiKey
// fields as the quick-connect modal, so both stay in sync automatically.

function showAiSettingsModal() {
  const modal = document.getElementById('aiSettingsModal');
  if (modal) modal.style.display = 'flex';
}

function hideAiSettingsModal() {
  const modal = document.getElementById('aiSettingsModal');
  if (modal) modal.style.display = 'none';
}

function bindAiSettingsModal() {
  document.getElementById('changeAiProviderBtn')?.addEventListener('click', showAiSettingsModal);
  document.getElementById('closeAiSettingsBtn')?.addEventListener('click', () => {
    persistProfileAndSettings();
    refreshApiStatus();
    hideAiSettingsModal();
  });

  document.getElementById('apiKey')?.addEventListener('input', (e) => {
    const detected = detectProviderFromApiKey(e.target.value);
    if (!detected) return;
    const select = document.getElementById('aiProvider');
    const option = select && [...select.options].find(o => o.value === detected);
    if (!option) return;
    select.value = detected;
    toggleCustomBaseURLSection();
    applyModelSuggestions();
    const status = document.getElementById('settingsStatus');
    if (status) { status.textContent = `Detected: ${option.textContent} — provider selected automatically.`; status.className = ''; }
  });
}

// ===== INIT =====

function bindAll() {
  bindNav();
  bindAddEntryButtons();
  bindStyleCards();
  bindPreviewTabs();
  bindPhotoUpload();

  document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
  document.getElementById('analyzeBtn')?.addEventListener('click', analyzeJD);
  document.getElementById('previewBtn')?.addEventListener('click', previewResume);
  document.getElementById('generateBtn')?.addEventListener('click', generateResume);
  document.getElementById('buildManualBtn')?.addEventListener('click', buildManualResume);
  document.getElementById('recheckAtsBtn')?.addEventListener('click', recheckResumeATSScore);
  document.getElementById('downloadResumeBtn')?.addEventListener('click', downloadResumePDF);
  document.getElementById('previewCLBtn')?.addEventListener('click', previewCoverLetter);
  document.getElementById('generateCLBtn')?.addEventListener('click', generateCoverLetter);
  document.getElementById('downloadCLBtn')?.addEventListener('click', downloadCoverLetterPDF);
  document.getElementById('testApiBtn')?.addEventListener('click', testApiKey);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  document.getElementById('aiProvider')?.addEventListener('change', () => { toggleCustomBaseURLSection(); applyModelSuggestions(); refreshApiStatus(); });
  document.getElementById('aiModel')?.addEventListener('input', refreshApiStatus);
  document.getElementById('apiKey')?.addEventListener('input', refreshApiStatus);
  document.getElementById('parseResumeBtn')?.addEventListener('click', parseResume);
  // Picking a different visual design re-renders the already-generated content
  // immediately — no need to re-click "Preview" to see the new design.
  document.getElementById('resumeTemplateId')?.addEventListener('change', () => {
    if (appState.generatedResume) previewResume();
  });
  document.getElementById('clTemplateId')?.addEventListener('change', () => {
    if (appState.generatedCoverLetter) previewCoverLetter();
  });
}

// ===== WELCOME / LANDING FLOW =====
// First-visit conversion page: upload + paste JD immediately, one CTA.
// Returning users (saved profile or already dismissed) go straight to the app.

function shouldShowWelcome() {
  return !localStorage.getItem('profile') && !localStorage.getItem('seenWelcome');
}

function dismissWelcome() {
  localStorage.setItem('seenWelcome', '1');
  document.getElementById('welcomeView').style.display = 'none';
  document.getElementById('app').style.display = '';
}

// Reverse of dismissWelcome — lets a user already in the Profile/Job/Generate
// flow return to the templates gallery. Doesn't touch 'seenWelcome': the
// welcome screen only auto-shows on first visit, this is a manual revisit.
function showWelcome() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('welcomeView').style.display = 'flex';
}

function bindWelcome() {
  document.getElementById('welcomeSkip')?.addEventListener('click', (e) => {
    e.preventDefault();
    dismissWelcome();
    goToStep(0); // Your Profile
  });

  document.getElementById('welcomeStartBtn')?.addEventListener('click', () => {
    // Hand the hero inputs to the real flow
    const jd = document.getElementById('welcomeJD')?.value || '';
    if (jd) document.getElementById('jdText').value = jd;

    const company = document.getElementById('welcomeCompany')?.value || '';
    if (company) document.getElementById('jdCompany').value = company;

    const heroFile = document.getElementById('welcomeFile')?.files?.[0];
    if (heroFile) {
      const dt = new DataTransfer();
      dt.items.add(heroFile);
      document.getElementById('resumeUploadInput').files = dt.files;
    }

    dismissWelcome();
    updateNavCompletion();

    const settings = collectSettings();
    goToStep(CONFIG.STEPS.indexOf('profile'));
    if (settings.apiKey && settings.model) {
      if (heroFile) parseResume(); // key already set: parse immediately, magic moment
    } else if (heroFile) {
      requireAiSettings(parseResume);
    } else {
      // No AI setup needed for a blank/manual resume.
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  bindAll();
  bindWelcome();
  bindWelcomeChoice();
  bindAiConnectModal();
  bindAiSettingsModal();
  bindEmailGate();
  bindSidebarToggle();
  bindPreviewEditing();
  bindPreviewFullscreen();
  initPreviewResizer();
  toggleCustomBaseURLSection();
  restoreProfileAndSettings(); // fast local paint, works fully offline/anonymous
  applyModelSuggestions();     // after restore: fills default model only if the field is empty/known-default
  loadTemplates();
  const savedStep = localStorage.getItem('currentStep');
  goToStep(savedStep ? parseInt(savedStep, 10) : 0);

  if (shouldShowWelcome()) {
    document.getElementById('welcomeView').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    loadTemplateGallery(); // "Free templates" is the default view — load it immediately, not on click
  }
});
