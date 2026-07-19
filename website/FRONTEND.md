# ApplyJob Frontend Architecture

## Overview

The frontend is a single-page application (SPA) implementing a 4-step workflow for generating resume and cover letter documents using AI. It features a Claude.ai-inspired design system with a modern, dark-themed UI.

## Design System

### Color Palette
- **Background Primary**: `#1a1a1a` (warm near-black)
- **Background Card**: `#262626` (card backgrounds)
- **Background Input**: `#2f2f2f` (input fields)
- **Border**: `#3d3d3d` (subtle borders)
- **Text Primary**: `#ececec` (main text)
- **Text Secondary**: `#a3a3a3` (secondary text, labels)
- **Accent**: `#cc785c` (orange-umber for CTAs)

### Layout
```
┌──────────────────────────────────────────────────────────┐
│  Sidebar (280px)  │  Main Content (flexible)  │ Preview  │
│  - Logo          │  - Step Indicator       │ (320px)  │
│  - Navigation    │  - Form / Content       │ - Tabs   │
│  - API Status    │  - Dynamic Sections     │ - iframe │
└──────────────────────────────────────────────────────────┘
```

On mobile (< 768px), layout stacks vertically and preview sidebar becomes a collapsible section.

### Typography
- **Font Family**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **No Google Fonts**: System fonts only for faster loading
- **Base Size**: 14px
- **Headings**: 24px (h1), 18px (h2)
- **Line Height**: 1.6 (normal text), 1.4 (tight), 1.8 (relaxed)

### Spacing
8px base unit system:
- `--space-xs`: 4px
- `--space-sm`: 8px
- `--space-md`: 16px
- `--space-lg`: 24px
- `--space-xl`: 32px

### Radius
- **Cards/Buttons**: 8px (`--radius-md`)
- **Inputs**: 6px (`--radius-sm`)

### Effects
- **No gradients, glow, or glassmorphism** — clean and minimal
- **Subtle transitions**: 150ms (fast), 250ms (normal)
- **Hover states**: Slight background change, no opacity shifts

## File Structure

```
website/
├── style.css              # Design system & all styles (no Google Fonts)
├── index.html             # Semantic HTML structure
├── app-frontend.js        # Core SPA logic (1000+ lines)
├── FRONTEND.md            # This file
├── dist/                  # Build output (optional)
└── (old files: app.css, app.js, auth.js, supabase-client.js)
```

## State Management

### AppState Object
```javascript
appState = {
  currentStep: 0,           // 0-3, maps to CONFIG.STEPS
  profile: {},              // User profile data
  jd: {},                   // Job description data
  settings: {},             // API/provider settings
  resumeTemplate: 'classic',
  clTemplate: 'formal',
  generatedResume: null,
  generatedCoverLetter: null,
}
```

### LocalStorage Keys
```javascript
CONFIG.STORAGE_KEYS = {
  PROFILE: 'profile',
  JD: 'jd',
  SETTINGS: 'settings',
  RESUME_TEMPLATE: 'resumeTemplate',
  CL_TEMPLATE: 'clTemplate',
}
```

Data persists automatically when saved.

## 4-Step Flow

### Step 1: Profile
**Path**: `#step-profile`

Collects user's professional information:
- **Basic**: Full name, email, phone, location, LinkedIn, GitHub
- **Professional Summary**: Free-form text (4 rows textarea)
- **Skills**: 6 categories
  - Languages (Python, JavaScript, SQL, etc.)
  - AI/ML (PyTorch, TensorFlow, LangChain, etc.)
  - Backend (FastAPI, Node.js, Django, etc.)
  - Cloud (AWS, GCP, Azure, etc.)
  - Frontend (React, Vue, CSS, etc.)
  - Human Languages (English, Spanish, etc.)
- **Dynamic Lists** (add/remove entries):
  - Experience (company, position, dates, description)
  - Education (school, degree, graduation date, GPA)
  - Projects (name, link, description)
  - Certifications (name, issuer, date)

**Save**: Persists to `localStorage['profile']`

### Step 2: Job Description
**Path**: `#step-job`

User inputs job details and description:
- **Company Name**: Text input
- **Job Title**: Text input
- **Location**: Text input
- **Job Description**: Large textarea (10 rows)

**Analyze Keywords**: POST `/api/analyze-keywords`
- Backend extracts skills and key requirements
- Returns `{ skills[], matchScore, insights }`
- Displays results with inline badges

**Save**: Persists to `localStorage['jd']`

### Step 3: Generate
**Path**: `#step-generate`

Selects templates and generates documents:
- **Resume Templates** (3 options):
  - Classic (📋): ATS-friendly, traditional
  - Modern (✨): Contemporary, 2-column layout
  - Minimal (✍️): Typography-first
- **Cover Letter Templates** (3 options):
  - Formal (📮): Business letter
  - Conversational (💬): Warm, personal
  - Brief (⚡): Short & punchy
- **Custom Instructions**: Optional textarea for specific requests

**Actions**:
1. **Preview (No AI)**: POST `/api/preview` — template-only preview
2. **Generate with AI**: POST `/api/generate` — calls configured AI provider
3. **Preview Tabs**: Switch between resume and cover letter
4. **Download Buttons**: POST `/api/pdf` to convert HTML → PDF

**Iframe**: Right sidebar displays generated HTML in `<iframe id="previewIframe">`

### Step 4: Settings
**Path**: `#step-settings`

Configures AI provider and API credentials:
- **AI Provider** (dropdown):
  - OpenAI (GPT-4, GPT-4o)
  - Anthropic (Claude 3.5 Sonnet, Haiku 4.5)
  - Google Gemini (2.0 Flash, 1.5 Pro)
  - DeepSeek (V3, R1)
  - OpenRouter (200+ models)
  - Groq (Llama 3.3, Mixtral)
  - Custom (OpenAI-compatible endpoint)
- **Custom Base URL** (conditional): Shows for "custom" provider
- **Model ID**: Text input (e.g., "gpt-4o", "claude-haiku-4-5-20251001")
- **API Key**: Password input, stored locally

**Actions**:
- **Test API Key**: POST `/api/test-api` — validates credentials
- **Save Settings**: Persists to `localStorage['settings']`

**Status Indicator** (sidebar):
- Shows provider name and "Ready" if configured
- Green dot when connected, gray otherwise

**Save**: Persists to `localStorage['settings']`

## Backend API Endpoints

All endpoints are POST requests to `http://localhost:3001/api`:

### `POST /api/analyze-keywords`
Analyzes job description and extracts requirements.
```javascript
{
  jobDescription: string
}
```
Response:
```javascript
{
  skills: string[],
  matchScore: number,
  insights: string
}
```

### `POST /api/preview`
Generates preview HTML (no AI, template only).
```javascript
{
  profile: Object,
  jd: Object,
  resumeTemplate: string,
  clTemplate: string
}
```
Response:
```javascript
{
  resume: string, // HTML
  coverLetter: string // HTML
}
```

### `POST /api/generate`
Generates final documents using AI.
```javascript
{
  profile: Object,
  jd: Object,
  resumeTemplate: string,
  clTemplate: string,
  customInstructions: string,
  aiProvider: string,
  aiModel: string,
  apiKey: string,
  customBaseURL: string // optional, for custom provider
}
```
Response:
```javascript
{
  resume: string, // HTML
  coverLetter: string // HTML
}
```

### `POST /api/test-api`
Tests API key validity.
```javascript
{
  aiProvider: string,
  aiModel: string,
  apiKey: string,
  customBaseURL: string // optional
}
```
Response:
```javascript
{
  success: boolean,
  message: string
}
```

### `POST /api/pdf`
Converts HTML to PDF and triggers download.
```javascript
{
  html: string,
  filename: string // "resume.pdf" or "cover-letter.pdf"
}
```
Response:
```javascript
{
  pdfUrl: string,
  download: string // alternative property
}
```

## Key Functions

### Navigation
- `goToStep(stepIndex)`: Switch between steps 0-3
- `initNavigation()`: Setup nav button listeners

### Profile
- `collectProfile()`: Gather all form data
- `saveProfile()`: Persist to localStorage
- `loadProfile()`: Restore from localStorage
- `addExperienceEntry()`, `addEducationEntry()`, etc.: Dynamic list management
- `removeEntry(entryId)`: Remove dynamic entry

### Job Description
- `collectJobDescription()`: Gather job details
- `saveJobDescription()`: Persist to localStorage
- `loadJobDescription()`: Restore from localStorage
- `analyzeKeywords()`: Call `/api/analyze-keywords`

### Generation
- `selectResumeType(type)`: Select resume template
- `selectCoverLetterType(type)`: Select cover letter template
- `previewDocuments()`: Call `/api/preview` without AI
- `generateDocuments()`: Call `/api/generate` with AI
- `downloadResume()`, `downloadCoverLetter()`: Call `/api/pdf`
- `updatePreviewIframe(html)`: Update right sidebar preview

### Settings
- `collectSettings()`: Gather API configuration
- `saveSettings()`: Persist to localStorage
- `loadSettings()`: Restore from localStorage
- `testApiKey()`: Call `/api/test-api`
- `updateApiStatus()`: Update sidebar status indicator

### Utilities
- `callBackend(endpoint, body)`: Wrapper for all API calls
- `showStatus(elementId, message, type)`: Display feedback messages
- `Storage.get(key)`, `Storage.set(key, value)`: localStorage wrapper

## CSS Classes Reference

### Layout
- `.app-container`: Root grid (sidebar, main, preview)
- `.sidebar`: Fixed left navigation (280px)
- `.main-content`: Flexible main area
- `.preview-sidebar`: Fixed right preview (320px)

### Navigation
- `.nav`: Navigation button container
- `.nav button`: Navigation buttons
- `.nav button.active`: Active step button
- `.api-status`: API status indicator

### Content
- `.step-content`: Step panel (hidden by default)
- `.step-content.active`: Visible step
- `.step-indicator`: Step counter text

### Forms
- `.form-section`: Grouped form fields
- `.form-input`: Text/email/tel/url/password inputs
- `.form-input:focus`: Input focus state

### Buttons
- `.btn`: Base button
- `.btn-primary`: CTA button (accent color)
- `.btn-secondary`: Secondary button
- `.btn-large`: Full-width button
- `.button-group`: Flex container for button rows

### Templates
- `.template-selector`: Grid of template cards (3-column)
- `.template-card`: Individual template option
- `.template-card.selected`: Active template
- `.template-preview`: Large emoji icon
- `.template-label`: Template name
- `.template-desc`: Template description

### Preview
- `.preview-tabs`: Tab navigation
- `.preview-tab`: Individual tab
- `.preview-tab.active`: Active tab
- `.preview-iframe`: iFrame element

### Dynamic Lists
- `.entry-container`: Wrapper for each entry
- `.btn-remove`: X button to delete entry
- `.entry-row`: Grid row of inputs (2 columns by default)
- `.entry-row.full`: Full-width row

### Status
- `#saveStatus`, `#settingsStatus`, etc.: Status message display
- `.success`: Green success state
- `.error`: Red error state

## Responsive Design

### Breakpoints
- **Desktop** (> 1200px): 3-column layout (sidebar, main, preview)
- **Tablet** (768px - 1200px): 1-column, sticky nav at top
- **Mobile** (< 768px): 1-column, horizontal nav

### Key Changes
- Sidebar becomes horizontal sticky header
- Preview sidebar moves below main content
- Template selector becomes 1-column
- Button groups stack vertically

## Error Handling

- **API Errors**: Caught in `callBackend()`, displayed via `showStatus()`
- **Validation**: Basic checks (required fields) in form functions
- **User Feedback**: Color-coded messages (green success, red error)
- **Auto-dismiss**: Status messages clear after 3 seconds

## Performance Considerations

1. **No External Fonts**: System font stack only
2. **Minimal CSS**: ~11KB style.css (no bloat)
3. **Lazy Loading**: Profile/JD/settings only load on demand
4. **Event Delegation**: Nav buttons use data attributes
5. **localStorage**: Persists data, reduces redundant API calls
6. **Iframe Preview**: Isolated document, prevents style conflicts

## Browser Support

- **Modern browsers** (Chrome, Firefox, Safari, Edge)
- **ES6+ features**: Async/await, arrow functions, destructuring
- **CSS Grid & Flexbox**: All major features supported
- **localStorage**: Required for data persistence
- **fetch API**: Required for backend communication

## Development Notes

### Adding a New Dynamic List
1. Create HTML template in step-profile
2. Add `add{Type}Entry()` function
3. Update `collectProfile()` to include new list
4. Update `loadProfile()` to restore entries
5. Add button listener in `initProfileListeners()`

### Adding a New Form Field
1. Add input in appropriate step section
2. Update `collect{Step}()` function
3. Update `load{Step}()` to restore value
4. Update `save{Step}()` or auto-save on blur

### Customizing Styling
- Modify CSS variables in `:root` for quick color/spacing changes
- Edit component classes for specific element styling
- Ensure mobile breakpoints are respected

### Debugging
- Check browser console for `callBackend()` errors
- Verify localStorage data: `localStorage.getItem('profile')`
- Check appState in console: `console.log(appState)`
- Network tab to inspect API calls and responses

## Future Enhancements

- [ ] Undo/redo functionality
- [ ] Multiple profile versions
- [ ] Template customization UI
- [ ] Export as JSON/CSV
- [ ] Drag-and-drop reordering for dynamic lists
- [ ] Real-time AI suggestions while typing
- [ ] Batch generation for multiple jobs
- [ ] Job application tracking
- [ ] Analytics dashboard
