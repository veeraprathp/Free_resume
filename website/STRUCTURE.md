# Frontend Project Structure & File Dependencies

## File Tree

```
website/
├── index.html                 (219 lines)  ← Start here: HTML structure
├── style.css                  (588 lines)  ← Design system & all styles
├── app-frontend.js            (737 lines)  ← SPA logic & state management
│
├── README.md                  Quick start & overview
├── FRONTEND.md                Architecture & function reference
├── DESIGN_GUIDE.md            Color, layout, components, accessibility
├── INTEGRATION_GUIDE.md       Backend API contract & data flows
├── STRUCTURE.md               This file: dependencies & flow
│
├── dist/                      (optional) Build output
│
└── (legacy files: app.css, app.js, auth.js, supabase-client.js)
```

## Load Order & Dependencies

```
Browser Request
    ↓
HTML (index.html)
    ├─ <link rel="stylesheet" href="style.css">
    │   └─> CSS loads first (blocks rendering)
    │
    ├─ <body> content renders
    │   └─> All form elements, sidebars, tabs
    │
    └─ <script src="app-frontend.js">
        └─> JavaScript loads and executes
            ├─ CONFIG object initialized
            ├─ appState object initialized
            ├─ All function definitions loaded
            └─ initApp() called on DOM ready
                ├─ Load saved data from localStorage
                ├─ Bind event listeners
                ├─ Go to step 1
                └─ Ready for user interaction
```

## Data Flow Architecture

```
localStorage (Persistent)
    ↑
    │ (save/load)
    │
appState (In-Memory)
    ↑
    │ (collect/update)
    │
DOM Elements (HTML + CSS)
    ↑
    │ (user input)
    │
User Interactions
    ↓
API Calls (to backend)
    ↓
Generated HTML/PDF
    ↓
Browser Download/Preview
```

## Component Hierarchy

```
app-container (grid: sidebar | main | preview)
│
├─ sidebar
│   ├─ logo
│   ├─ nav
│   │   ├─ .nav-btn[data-step="profile"]
│   │   ├─ .nav-btn[data-step="job"]
│   │   ├─ .nav-btn[data-step="generate"]
│   │   └─ .nav-btn[data-step="settings"]
│   └─ api-status
│       ├─ status-dot (colored indicator)
│       └─ status-text
│
├─ main-content
│   ├─ step-indicator (#stepNumber)
│   │
│   ├─ step-profile (form, dynamic lists)
│   │   ├─ form-section (basic info)
│   │   ├─ form-section (skills)
│   │   ├─ form-section (experience list)
│   │   │   └─ entry-container × N
│   │   │       ├─ entry-row × 2-3
│   │   │       └─ btn-remove
│   │   ├─ form-section (education list)
│   │   ├─ form-section (projects list)
│   │   ├─ form-section (certifications list)
│   │   ├─ saveProfileBtn (.btn-primary)
│   │   └─ saveStatus (feedback)
│   │
│   ├─ step-job (form, keyword analysis)
│   │   ├─ form-section (company, title, location)
│   │   ├─ form-section (job description textarea)
│   │   ├─ analyzeBtn
│   │   ├─ keywordResults (dynamic)
│   │   └─ atsScoreCard (dynamic)
│   │
│   ├─ step-generate (templates, generation)
│   │   ├─ form-section (resume templates)
│   │   │   └─ template-selector
│   │   │       ├─ template-card[data-type="classic"]
│   │   │       ├─ template-card[data-type="modern"]
│   │   │       └─ template-card[data-type="minimal"]
│   │   ├─ form-section (cover letter templates)
│   │   │   └─ template-selector
│   │   │       ├─ template-card[data-type="formal"]
│   │   │       ├─ template-card[data-type="conversational"]
│   │   │       └─ template-card[data-type="brief"]
│   │   ├─ form-section (custom instructions)
│   │   ├─ button-group
│   │   │   ├─ previewBtn
│   │   │   └─ generateBtn
│   │   └─ previewPanel (dynamic)
│   │
│   └─ step-settings (API configuration)
│       ├─ form-section (provider dropdown)
│       ├─ customBaseURLSection (conditional)
│       ├─ form-section (model ID)
│       ├─ form-section (API key)
│       ├─ testApiBtn
│       ├─ saveSettingsBtn
│       └─ settingsStatus (feedback)
│
└─ preview-sidebar
    ├─ preview-tabs
    │   ├─ preview-tab[data-preview="resume"]
    │   └─ preview-tab[data-preview="coverletter"]
    └─ preview-iframe (srcdoc = generated HTML)
```

## Function Call Graph

### Initialization Flow

```
initApp() [called on DOM ready]
│
├─ loadProfile()
│   └─ Storage.get('profile') → populate form fields
│
├─ loadJobDescription()
│   └─ Storage.get('jd') → populate JD fields
│
├─ loadSettings()
│   └─ Storage.get('settings') → populate API config
│
├─ initNavigation()
│   └─ Add click listeners to .nav-btn
│
├─ initProfileListeners()
│   ├─ saveProfileBtn → saveProfile()
│   ├─ addExperienceBtn → addExperienceEntry()
│   ├─ addEducationBtn → addEducationEntry()
│   ├─ addProjectBtn → addProjectEntry()
│   └─ addCertBtn → addCertificationEntry()
│
├─ initJobListeners()
│   ├─ analyzeBtn → analyzeKeywords()
│   └─ Auto-save on blur
│
├─ initGenerateListeners()
│   ├─ Template card clicks → selectResumeType() / selectCoverLetterType()
│   ├─ previewBtn → previewDocuments()
│   ├─ generateBtn → generateDocuments()
│   └─ preview-tab clicks → updatePreviewIframe()
│
├─ initSettingsListeners()
│   ├─ aiProvider change → show/hide customBaseURLSection
│   ├─ testApiBtn → testApiKey()
│   └─ saveSettingsBtn → saveSettings()
│
├─ updateApiStatus()
│   └─ Update sidebar indicator color/text
│
└─ goToStep(0)
    └─ Display step 1 (profile)
```

### User Interaction Flow: Save Profile

```
User fills form → Click "Save Profile"
    ↓
saveProfile()
    ├─ collectProfile()
    │   ├─ Read all form inputs: fullName, email, phone, etc.
    │   ├─ collectDynamicList('experience')
    │   │   └─ Loop through .entry-container, extract fields
    │   ├─ collectDynamicList('education')
    │   ├─ collectDynamicList('projects')
    │   └─ collectDynamicList('certifications')
    ├─ appState.profile = profile object
    ├─ Storage.set('profile', profile)
    │   └─ localStorage.setItem('profile', JSON.stringify(profile))
    ├─ showStatus('saveStatus', 'Profile saved...', 'success')
    └─ Auto-dismiss after 3 seconds
```

### User Interaction Flow: Analyze Keywords

```
User pastes job description → Click "Analyze Keywords"
    ↓
analyzeKeywords()
    ├─ collectJobDescription()
    │   └─ Read jdCompany, jdTitle, jdLocation, jdText
    ├─ saveJobDescription()
    │   └─ Storage.set('jd', jd)
    ├─ callBackend('/analyze-keywords', { jobDescription })
    │   ├─ POST to http://localhost:3001/api/analyze-keywords
    │   └─ Wait for response: { skills[], matchScore, insights }
    ├─ Display results in #keywordResults
    │   └─ Render skill badges, match score, insights
    └─ showStatus if error
```

### User Interaction Flow: Generate with AI

```
User fills profile, job, templates, settings → Click "Generate with AI"
    ↓
generateDocuments()
    ├─ saveProfile()
    ├─ saveJobDescription()
    ├─ Validate settings (apiKey, aiModel) — if missing, redirect to step 4
    ├─ collectSettings()
    ├─ callBackend('/generate', {
    │   profile,
    │   jd,
    │   resumeTemplate,
    │   clTemplate,
    │   customInstructions,
    │   aiProvider,
    │   aiModel,
    │   apiKey,
    │   customBaseURL
    │ })
    │   └─ Backend calls AI provider (OpenAI, Anthropic, etc.)
    │       └─ Response: { resume: HTML, coverLetter: HTML }
    ├─ appState.generatedResume = HTML
    ├─ appState.generatedCoverLetter = HTML
    ├─ updatePreviewIframe(appState.generatedResume)
    │   └─ #previewIframe.srcdoc = generated HTML
    ├─ Display "✅ Documents Generated!" message
    └─ Add download buttons
        ├─ Download Resume (PDF)
        └─ Download Cover Letter (PDF)
```

### User Interaction Flow: Download PDF

```
User clicks "Download Resume (PDF)"
    ↓
downloadResume()
    ├─ Validate appState.generatedResume exists
    ├─ callBackend('/pdf', {
    │   html: appState.generatedResume,
    │   filename: 'resume.pdf'
    │ })
    │   └─ Backend converts HTML → PDF (puppeteer/pdfkit)
    │       └─ Response: { pdfUrl: 'data:...pdf' }
    ├─ Create <a> element with href = pdfUrl
    ├─ Set download attribute to 'resume.pdf'
    ├─ Trigger click() to download
    └─ showStatus if error
```

## State Transitions

```
appState = {
  currentStep: 0,              ← goToStep() changes this
  profile: {},                 ← collectProfile() updates
  jd: {},                      ← collectJobDescription() updates
  settings: {},                ← collectSettings() updates
  resumeTemplate: 'classic',   ← selectResumeType() updates
  clTemplate: 'formal',        ← selectCoverLetterType() updates
  generatedResume: null,       ← generateDocuments() updates
  generatedCoverLetter: null   ← generateDocuments() updates
}
```

### Step Transitions

```
User clicks nav button → goToStep(stepIndex)
    ↓
Loop: Hide all .step-content, remove .active from all .nav-btn
    ↓
Show target step (#step-{stepName}), add .active to button
    ↓
Update #stepNumber text ("Step X of 4")
    ↓
Update appState.currentStep
```

## API Call Sequence Diagram

```
Frontend                       Backend
   │                             │
   │─── POST /analyze-keywords ──>│
   │   { jobDescription }         │
   │                              │ Extract skills
   │                              │
   │<─── { skills[], matchScore }─│
   │                              │
   │─── POST /preview ────────────>│
   │   { profile, jd,              │
   │     resumeTemplate }          │
   │                              │ Format templates
   │                              │
   │<─── { resume, coverLetter }──│
   │                              │
   │─── POST /generate ────────────>│
   │   { profile, jd, apiKey,      │
   │     aiModel, ... }            │
   │                              │ Call AI provider
   │                              │ Format response
   │                              │
   │<─── { resume, coverLetter }──│
   │                              │
   │─── POST /pdf ────────────────>│
   │   { html, filename }          │
   │                              │ Convert HTML → PDF
   │                              │
   │<─── { pdfUrl }───────────────│
   │                              │
   │ Browser downloads PDF        │
```

## Event Listener Binding

```
initNavigation()
├─ .nav-btn click → goToStep()

initProfileListeners()
├─ #addExperienceBtn click → addExperienceEntry()
├─ #addEducationBtn click → addEducationEntry()
├─ #addProjectBtn click → addProjectEntry()
├─ #addCertBtn click → addCertificationEntry()
├─ (dynamic) .btn-remove click → removeEntry()
└─ #saveProfileBtn click → saveProfile()

initJobListeners()
├─ #analyzeBtn click → analyzeKeywords()
├─ #jdCompany blur → saveJobDescription()
├─ #jdTitle blur → saveJobDescription()
├─ #jdLocation blur → saveJobDescription()
└─ #jdText blur → saveJobDescription()

initGenerateListeners()
├─ #resumeSelector .template-card click → selectResumeType()
├─ #clSelector .template-card click → selectCoverLetterType()
├─ #previewBtn click → previewDocuments()
├─ #generateBtn click → generateDocuments()
└─ .preview-tab click → updatePreviewIframe()

initSettingsListeners()
├─ #aiProvider change → show/hide customBaseURLSection
├─ #testApiBtn click → testApiKey()
└─ #saveSettingsBtn click → saveSettings()
```

## localStorage Serialization

```
JavaScript Object
    ↓
JSON.stringify(object)
    ↓
localStorage.setItem(key, jsonString)
    ↓
[persistent storage]
    ↓
localStorage.getItem(key)
    ↓
JSON.parse(jsonString)
    ↓
JavaScript Object
```

Example:
```javascript
// Save
const profile = { fullName: "John Doe", email: "john@example.com" };
localStorage.setItem('profile', JSON.stringify(profile));

// Load
const raw = localStorage.getItem('profile');
const profile = JSON.parse(raw);
console.log(profile.fullName); // "John Doe"
```

## CSS Cascade & Specificity

```
style.css
├─ Reset (* { margin: 0; padding: 0; })
├─ :root (CSS variables)
├─ html, body (base styles)
├─ .app-container (grid layout)
├─ .sidebar (left panel)
│   ├─ .logo
│   ├─ .nav
│   │   ├─ button (base)
│   │   ├─ button:hover
│   │   ├─ button.active
│   │   └─ button:disabled
│   └─ .api-status
├─ .main-content
├─ .step-content
│   └─ .step-content.active
├─ .form-section
├─ .form-input
│   ├─ .form-input:hover
│   ├─ .form-input:focus
│   └─ .form-input:disabled
├─ .btn, .btn-primary, .btn-secondary, .btn-large
├─ .template-selector, .template-card, .template-card.selected
├─ .preview-sidebar
├─ .entry-container
├─ Responsive @media queries (1200px, 768px)
└─ Scrollbar styling ::-webkit-scrollbar
```

## Performance Considerations

```
Load Time Optimization:
├─ style.css (11KB) loads first → no FOUC
├─ index.html (9KB) structure loads → renders DOM
├─ app-frontend.js (24KB) loads async → initializes on ready
└─ No external dependencies (no Google Fonts, no CDN)

Memory Usage:
├─ appState object (small, ~5KB)
├─ localStorage (persists across sessions, ~10-50KB total)
└─ Generated HTML (resume ~10-30KB, cover letter ~5-15KB)

Interaction Performance:
├─ Form input → instant feedback (no validation delay)
├─ Button click → immediate visual feedback
├─ API calls → async, doesn't block UI
└─ localStorage → synchronous, <1ms
```

## Error Handling Paths

```
API Call Error
    ↓
callBackend() catch block
    ├─ console.error()
    ├─ throw error
    └─ Caller catches
        └─ showStatus(elementId, message, 'error')
            ├─ Red background, red border, red text
            └─ User sees error message

Form Validation Error
    ├─ Check required fields
    ├─ If empty:
    │   └─ showStatus('error: Please fill in all fields')
    └─ If valid:
        └─ Continue with save/submit

API Test Error
    └─ testApiKey()
        └─ If success: updateApiStatus() + green indicator
        └─ If error: showStatus() + red indicator
```

## Mobile Responsive Breakpoints

```
@media (max-width: 1200px)
├─ .app-container: 1 column
├─ .sidebar: horizontal sticky header
├─ .nav: flex row
└─ .preview-sidebar: below main

@media (max-width: 768px)
├─ .sidebar: max-height unset, border-bottom not border-right
├─ .main-content: padding reduced
├─ .step-content h1: smaller font
├─ .button-group: flex column
├─ .entry-row: 1 column
└─ .template-selector: 1 column
```

---

**Key Takeaway**: The frontend is a self-contained SPA with minimal dependencies, using localStorage for persistence and fetch API for backend communication. All data flows through appState, which is the single source of truth for the UI.
