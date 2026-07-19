# Frontend-Backend Integration Guide

## Quick Start

### 1. Backend Requirements

Ensure the Express backend is running at `http://localhost:3001` with these API endpoints:

```
POST /api/analyze-keywords     (analyze job description)
POST /api/preview              (generate preview HTML)
POST /api/generate             (generate with AI)
POST /api/test-api            (test API credentials)
POST /api/pdf                 (convert HTML to PDF)
```

### 2. Frontend Files

Three key files need to be served:

```
website/
├── index.html              (HTML structure)
├── style.css              (Claude-inspired design)
└── app-frontend.js        (Core SPA logic)
```

### 3. Deployment

Serve static files from `website/` directory:

```bash
# Using Python
python -m http.server 3000 -d website/

# Using Node.js (http-server)
npx http-server website -p 3000

# Using Node.js (Express)
app.use(express.static('website'));

# Using Nginx
location / {
    root /path/to/website;
    try_files $uri /index.html;
}
```

Open browser to `http://localhost:3000`

## Data Flow

### Step 1: Profile Collection

```
User Input
    ↓
collectProfile() — gather form data
    ↓
appState.profile = { fullName, email, phone, ... }
    ↓
Storage.set('profile', appState.profile)
    ↓
localStorage['profile']
```

### Step 2: Job Analysis

```
User Pastes JD
    ↓
User clicks "Analyze Keywords"
    ↓
POST /api/analyze-keywords { jobDescription }
    ↓
Backend extracts skills, match score
    ↓
Display results with badges
    ↓
saveJobDescription() → localStorage['jd']
```

### Step 3: Generate

```
User selects templates + custom instructions
    ↓
User clicks "Generate with AI"
    ↓
Validate API settings (Step 4) — if missing, redirect
    ↓
POST /api/generate {
  profile,
  jd,
  resumeTemplate,
  clTemplate,
  customInstructions,
  aiProvider,
  aiModel,
  apiKey,
  customBaseURL
}
    ↓
Backend calls AI provider (OpenAI, Anthropic, etc.)
    ↓
Response: { resume: HTML, coverLetter: HTML }
    ↓
appState.generatedResume = HTML
    ↓
Display in preview iframe
```

### Step 4: Download

```
User clicks "Download Resume (PDF)"
    ↓
POST /api/pdf { html, filename: 'resume.pdf' }
    ↓
Backend converts HTML → PDF (puppeteer, pdfkit, etc.)
    ↓
Response: { pdfUrl } or { download }
    ↓
Browser downloads PDF
```

## API Contract Details

### POST /api/analyze-keywords

**Request:**
```javascript
{
  jobDescription: string
}
```

**Response:**
```javascript
{
  success: boolean,
  skills: string[],           // ["Python", "React", "AWS"]
  matchScore: number,          // 0-100
  insights: string            // "Strong match for backend roles"
}
```

**Frontend Integration:**
```javascript
// In analyzeKeywords()
const result = await callBackend('/analyze-keywords', {
  jobDescription: jd.description
});

// Display results
resultsDiv.innerHTML = `
  <div>Key Skills: ${result.skills.join(', ')}</div>
  <div>Match Score: ${result.matchScore}%</div>
  <div>${result.insights}</div>
`;
```

### POST /api/preview

**Request:**
```javascript
{
  profile: {
    fullName: string,
    email: string,
    phone: string,
    location: string,
    linkedin: string,
    github: string,
    summary: string,
    skills: {
      languages: string,
      aiml: string,
      backend: string,
      cloud: string,
      frontend: string,
      humanLanguages: string
    },
    experience: [
      {
        company: string,
        position: string,
        startDate: string,
        endDate: string,
        description: string
      }
    ],
    education: [...],
    projects: [...],
    certifications: [...]
  },
  jd: {
    company: string,
    title: string,
    location: string,
    description: string
  },
  resumeTemplate: 'classic' | 'modern' | 'minimal',
  clTemplate: 'formal' | 'conversational' | 'brief'
}
```

**Response:**
```javascript
{
  success: boolean,
  resume: string,            // HTML markup
  coverLetter: string        // HTML markup
}
```

**Frontend Integration:**
```javascript
// In previewDocuments()
const result = await callBackend('/preview', payload);

// Display in iframe
const iframe = document.getElementById('previewIframe');
iframe.srcdoc = result.resume;
```

### POST /api/generate

**Request:**
```javascript
{
  profile: {...},            // (same as preview)
  jd: {...},                // (same as preview)
  resumeTemplate: string,
  clTemplate: string,
  customInstructions: string,  // optional user instructions
  aiProvider: string,         // 'openai', 'anthropic', 'gemini', etc.
  aiModel: string,           // 'gpt-4o', 'claude-3.5-sonnet', etc.
  apiKey: string,            // provider API key
  customBaseURL?: string     // only for custom provider
}
```

**Response:**
```javascript
{
  success: boolean,
  resume: string,            // Generated HTML
  coverLetter: string        // Generated HTML
}
```

**Expected Backend Logic:**
```javascript
// Pseudocode
const { generateText } = require('ai');

const result = await generateText({
  model: getModel(aiProvider, aiModel, apiKey, customBaseURL),
  prompt: buildPrompt(profile, jd, customInstructions),
  temperature: 0.7,
  maxTokens: 2000
});

// Format response based on template
const resume = formatTemplate(result, 'resume', resumeTemplate);
const coverLetter = formatTemplate(result, 'coverletter', clTemplate);

return { success: true, resume, coverLetter };
```

### POST /api/test-api

**Request:**
```javascript
{
  aiProvider: string,
  aiModel: string,
  apiKey: string,
  customBaseURL?: string
}
```

**Response:**
```javascript
{
  success: boolean,
  message: string           // "API key is valid" or error message
}
```

**Frontend Integration:**
```javascript
// In testApiKey()
const result = await callBackend('/test-api', {
  aiProvider: settings.aiProvider,
  aiModel: settings.aiModel,
  apiKey: settings.apiKey
});

if (result.success) {
  showStatus('settingsStatus', 'API Key is valid!', 'success');
  updateApiStatus();
} else {
  showStatus('settingsStatus', `API Test failed: ${result.message}`, 'error');
}
```

### POST /api/pdf

**Request:**
```javascript
{
  html: string,             // Generated HTML from step 3
  filename: string          // 'resume.pdf' or 'cover-letter.pdf'
}
```

**Response:**
```javascript
{
  success: boolean,
  pdfUrl: string,          // Data URL or download URL
  download: string         // alternative property name
}
```

**Frontend Integration:**
```javascript
// In downloadResume()
const result = await callBackend('/pdf', {
  html: appState.generatedResume,
  filename: 'resume.pdf'
});

// Trigger browser download
const link = document.createElement('a');
link.href = result.pdfUrl || result.download;
link.download = 'resume.pdf';
link.click();
```

## Error Handling

### Backend Error Responses

All endpoints should return consistent error format:

```javascript
// Success
{
  success: true,
  data: {...}
}

// Error
{
  success: false,
  message: "Human-readable error message",
  code: "ERROR_CODE"  // optional
}
```

### Frontend Error Handling

```javascript
async function callBackend(endpoint, body = null) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Backend call failed:', error);
    showStatus(statusElementId, `Error: ${error.message}`, 'error');
    throw error;  // Re-throw for caller to handle
  }
}
```

### User-Facing Errors

Displayed in colored status divs:

```javascript
// Success (green)
#saveStatus.success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid #22c55e;
  color: #22c55e;
}

// Error (red)
#settingsStatus.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #ef4444;
}
```

## CORS Configuration

Backend must allow requests from frontend origin:

```javascript
// Express CORS setup
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000',  // or production domain
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
```

## Storage Architecture

### localStorage Keys

```javascript
{
  'profile': {
    fullName: string,
    email: string,
    phone: string,
    location: string,
    linkedin: string,
    github: string,
    summary: string,
    skills: {...},
    experience: [...],
    education: [...],
    projects: [...],
    certifications: [...]
  },
  
  'jd': {
    company: string,
    title: string,
    location: string,
    description: string
  },
  
  'settings': {
    aiProvider: string,
    aiModel: string,
    apiKey: string,
    customBaseURL?: string
  },
  
  'resumeTemplate': 'classic' | 'modern' | 'minimal',
  'clTemplate': 'formal' | 'conversational' | 'brief'
}
```

### Auto-Save Behavior

**Profile Step:**
- `saveProfileBtn` click → `saveProfile()` → localStorage
- Validation: Basic (non-empty name, email)

**Job Step:**
- Blur events on inputs → `saveJobDescription()` → localStorage
- Auto-save on field change

**Generate Step:**
- Template selection → `selectResumeType()` / `selectCoverLetterType()` → localStorage
- No manual save (automatic)

**Settings Step:**
- `saveSettingsBtn` click → `saveSettings()` → localStorage
- Validation: Required (apiKey, aiModel)

## Testing Checklist

### Unit Tests (Optional)

```javascript
// Test collectProfile()
const profile = collectProfile();
assert(profile.fullName === 'John Doe');

// Test selectResumeType()
selectResumeType('modern');
assert(appState.resumeTemplate === 'modern');

// Test Storage
Storage.set('test', { foo: 'bar' });
Storage.get('test').then(result => {
  assert(result.foo === 'bar');
});
```

### Integration Tests

```javascript
// Test API flow
const response = await callBackend('/analyze-keywords', {
  jobDescription: 'Python, React, AWS...'
});
assert(response.success === true);
assert(response.skills.includes('Python'));

// Test preview generation
const preview = await callBackend('/preview', payload);
assert(preview.resume.includes('<html>'));
assert(preview.coverLetter.includes('<html>'));

// Test full generation with AI
const result = await callBackend('/generate', fullPayload);
assert(result.resume.length > 500);
```

### Manual Testing

1. **Profile Step**: Fill all fields, verify save works
2. **Job Step**: Paste job description, analyze keywords
3. **Generate Step**: Select templates, preview (no AI)
4. **Settings Step**: Enter API key, test connection
5. **Full Flow**: Generate documents with AI, download PDF
6. **LocalStorage**: Open DevTools, verify data persists
7. **Refresh**: Reload page, data should restore

## Debugging Tips

### Check Network Requests

```javascript
// Open DevTools → Network tab
// Look for POST requests to /api/*
// Check response status: 200 = success, 4xx/5xx = error
// View response body for error messages
```

### Check Local Storage

```javascript
// In DevTools Console
localStorage.getItem('profile')
localStorage.getItem('settings')
// Should return JSON strings

// Clear all data
localStorage.clear()
```

### Check App State

```javascript
// In DevTools Console
console.log(appState)
console.log(appState.profile)
console.log(appState.generatedResume)
```

### Check Backend Logs

```bash
# Backend terminal should show:
# POST /api/analyze-keywords 200
# POST /api/generate 200
# etc.

# Check for errors in backend console
```

### Common Issues

**Issue**: "CORS error" 
**Solution**: Verify backend CORS middleware is enabled

**Issue**: "API key not accepted"
**Solution**: Check API key is valid, test in /settings

**Issue**: "Blank preview"
**Solution**: Check if /api/preview endpoint returns valid HTML

**Issue**: "Downloaded PDF is corrupted"
**Solution**: Verify /api/pdf endpoint is using proper PDF library

## Performance Optimization

### Frontend

- ✓ Minimal CSS (11KB, no external fonts)
- ✓ No unnecessary re-renders
- ✓ localStorage caching reduces API calls
- ✓ Lazy-loading of sections (not all rendered upfront)

### Backend

- Recommended: Cache AI API responses for identical profiles
- Recommended: Rate limit /api/generate to prevent abuse
- Recommended: Use connection pooling for database
- Recommended: Compress responses with gzip middleware

## Future API Extensions

### Save Generation History

```javascript
POST /api/history
{ profile, jd, resume, coverLetter, timestamp }

GET /api/history
[{ timestamp, company, jobTitle, resume, coverLetter }, ...]
```

### ATS Score API

```javascript
POST /api/ats-score
{ resume, jobDescription }

Response: { score: 85, missingKeywords: [...], suggestions: [...] }
```

### Batch Generation

```javascript
POST /api/batch-generate
{ profile, jobs: [jd1, jd2, jd3], resumeTemplate, clTemplate }

Response: { generations: [{ company, resume, coverLetter }, ...] }
```

### Email Delivery

```javascript
POST /api/send-email
{ emailAddress, resume, coverLetter, subject, body }

Response: { success: true, messageId: "..." }
```
