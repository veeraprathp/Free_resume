# ApplyJob — Frontend Single-Page Application

A modern, Claude.ai-inspired web UI for generating resume and cover letter documents using AI.

## 🚀 Quick Start

### Prerequisites
- Express backend running on `http://localhost:3001`
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Serve Frontend
```bash
# Using Python 3
python -m http.server 3000 -d website/

# Using Node.js (http-server package)
npx http-server website -p 3000

# Using Live Server (VS Code extension)
# Right-click index.html → Open with Live Server
```

Open browser to `http://localhost:3000`

## 📁 Files Overview

### Core UI Files (Required)
```
index.html          (219 lines)   Semantic HTML structure
style.css          (588 lines)   Claude-inspired design system
app-frontend.js    (737 lines)   SPA logic & state management
```

### Documentation
```
FRONTEND.md        Architecture, file structure, API endpoints
DESIGN_GUIDE.md    Color palette, layout, components, accessibility
INTEGRATION_GUIDE.md Backend contract, data flows, error handling
README.md          This file
```

### Legacy Files (Optional)
```
app.css            (Old design system — can be removed)
app.js             (Old SPA logic — can be removed)
auth.js            (Supabase auth — optional)
supabase-client.js (Supabase client — optional)
```

## 🎨 Design System

**Color Palette** (Dark theme, warm tones)
- Background Primary: `#1a1a1a`
- Background Card: `#262626`
- Text Primary: `#ececec`
- Accent (CTA): `#cc785c` (orange-umber)

**Typography**
- System font stack (no Google Fonts)
- Base font size: 14px
- Line height: 1.6 (normal), 1.4 (tight)

**Layout**
- 3-column grid: Sidebar (280px) | Main | Preview (320px)
- Responsive: Stacks on tablet/mobile
- 8px base unit spacing system

**No effects**: No gradients, glow, or glassmorphism — clean and minimal.

## 🔄 4-Step Workflow

### Step 1: Profile
Collect user's professional information:
- Basic info (name, email, phone, location, LinkedIn, GitHub)
- Professional summary
- Technical skills (6 categories)
- Experience, education, projects, certifications (dynamic lists)

**Save**: Persists to `localStorage['profile']`

### Step 2: Job Description
Paste and analyze job postings:
- Company name, job title, location
- Full job description (textarea)
- **Analyze Keywords**: Extracts skills and match score
- Auto-saves to `localStorage['jd']`

### Step 3: Generate
Select templates and generate documents:
- Resume templates: Classic, Modern, Minimal
- Cover letter templates: Formal, Conversational, Brief
- Custom instructions (optional)
- **Preview** (no AI): Shows template-only
- **Generate with AI**: Calls configured AI provider
- **Download PDF**: Converts to PDF and downloads

**Preview Sidebar** (right): Live HTML preview in iframe, switchable tabs

### Step 4: Settings
Configure AI provider and credentials:
- AI Provider dropdown (OpenAI, Anthropic, Gemini, etc.)
- Model ID (e.g., "gpt-4o", "claude-haiku-4-5-20251001")
- API Key (stored locally in localStorage)
- Test API Key button to validate
- Status indicator shows connection status

**Save**: Persists to `localStorage['settings']`

## 💾 Data Persistence

All user data is stored in `localStorage`:

```javascript
{
  'profile':      { fullName, email, skills, experience[], ... },
  'jd':           { company, title, description, ... },
  'settings':     { aiProvider, aiModel, apiKey, customBaseURL },
  'resumeTemplate':  'classic' | 'modern' | 'minimal',
  'clTemplate':      'formal' | 'conversational' | 'brief'
}
```

Data persists across browser sessions. Clear with DevTools or `localStorage.clear()`.

## 🔌 Backend API Integration

All requests POST to `http://localhost:3001/api`:

| Endpoint | Purpose |
|----------|---------|
| `/analyze-keywords` | Extract skills from job description |
| `/preview` | Generate preview HTML (no AI) |
| `/generate` | Generate with AI (requires settings) |
| `/test-api` | Validate API credentials |
| `/pdf` | Convert HTML to PDF |

See `INTEGRATION_GUIDE.md` for detailed endpoint specs.

## 🎯 Key Functions

### Navigation & State
- `goToStep(stepIndex)`: Switch between 4 steps
- `initNavigation()`: Setup navigation listeners

### Profile Management
- `collectProfile()`: Gather form data
- `saveProfile()`: Persist to localStorage
- `loadProfile()`: Restore from localStorage
- `addExperienceEntry()`, `addEducationEntry()`, etc.: Dynamic lists

### Job Analysis
- `analyzeKeywords()`: POST /api/analyze-keywords
- `collectJobDescription()`, `saveJobDescription()`, etc.

### Document Generation
- `selectResumeType(type)`: Select resume template
- `selectCoverLetterType(type)`: Select cover letter template
- `previewDocuments()`: POST /api/preview (no AI)
- `generateDocuments()`: POST /api/generate (with AI)
- `downloadResume()`, `downloadCoverLetter()`: POST /api/pdf
- `updatePreviewIframe(html)`: Update right sidebar

### Settings & Config
- `collectSettings()`, `saveSettings()`, `loadSettings()`
- `testApiKey()`: POST /api/test-api
- `updateApiStatus()`: Update sidebar indicator

### Utilities
- `callBackend(endpoint, body)`: Fetch wrapper with error handling
- `showStatus(elementId, message, type)`: Display feedback messages
- `Storage.get(key)`, `Storage.set(key, value)`: localStorage helper

## 📦 State Management (appState)

```javascript
appState = {
  currentStep: 0,                    // 0-3
  profile: {},                       // User profile data
  jd: {},                            // Job description
  settings: {},                      // API settings
  resumeTemplate: 'classic',         // Selected template
  clTemplate: 'formal',              // Selected template
  generatedResume: null,             // Generated HTML
  generatedCoverLetter: null,        // Generated HTML
}
```

## 🎨 CSS Classes

### Layout
- `.app-container`: Root grid layout
- `.sidebar`: Left navigation (280px fixed)
- `.main-content`: Flexible main area
- `.preview-sidebar`: Right preview area (320px fixed)

### Navigation
- `.nav`: Navigation button container
- `.nav-btn.active`: Active step button
- `.api-status`: API status indicator

### Forms
- `.form-section`: Grouped form fields
- `.form-input`: Text inputs, textareas, selects
- `.form-input:focus`: Focus state (accent border)

### Buttons
- `.btn`: Base button
- `.btn-primary`: CTA button (accent background)
- `.btn-secondary`: Secondary button (transparent)
- `.btn-large`: Full-width button
- `.button-group`: Flex container for button rows

### Templates
- `.template-selector`: 3-column grid of options
- `.template-card`: Individual template card
- `.template-card.selected`: Active template

### Dynamic Lists
- `.entry-container`: Each entry wrapper
- `.btn-remove`: Delete button (✕)
- `.entry-row`: 2-column input grid
- `.entry-row.full`: Full-width row

## 🌐 Responsive Design

### Desktop (> 1200px)
3-column layout: Sidebar | Main | Preview

### Tablet (768px - 1200px)
- Sidebar becomes horizontal sticky header
- Main content full width
- Preview sidebar below main (collapsible)

### Mobile (< 768px)
- Single column layout
- Horizontal navigation bar
- Buttons stack vertically
- Template grid becomes single column

See `DESIGN_GUIDE.md` for detailed breakpoints.

## ♿ Accessibility

- ✓ WCAG AA contrast compliance (4.5:1 minimum)
- ✓ Semantic HTML (h1, h2, form elements)
- ✓ Keyboard navigation (Tab, Enter, Arrows)
- ✓ Focus states visible on all interactive elements
- ✓ Color not the only indicator (text labels, icons)
- ✓ Screen reader friendly (descriptive text)

## 🧪 Testing

### Manual Testing Steps
1. **Profile**: Fill all fields, click save, reload page → data restores
2. **Job**: Paste JD, click analyze, review keywords
3. **Generate**: Select templates, click preview (no AI)
4. **Settings**: Enter API key, click test → status updates
5. **Full Flow**: Generate with AI, download PDF
6. **Mobile**: Test on phone-sized viewport (< 768px)

### Browser Testing
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Debugging Tips

**Check Network Requests**
```javascript
// DevTools → Network tab
// Look for POST /api/* requests
// Check response status and body
```

**Check Local Storage**
```javascript
// DevTools → Application → Local Storage
localStorage.getItem('profile')
localStorage.getItem('settings')
localStorage.clear()  // Clear all
```

**Check App State**
```javascript
// DevTools Console
console.log(appState)
appState.currentStep  // Check current step
```

## ⚙️ Configuration

### Backend URL
```javascript
// In app-frontend.js
const CONFIG = {
  BACKEND_URL: 'http://localhost:3001/api'
};
```
Change this if backend runs on different port/domain.

### Storage Keys
```javascript
CONFIG.STORAGE_KEYS = {
  PROFILE: 'profile',
  JD: 'jd',
  SETTINGS: 'settings',
  RESUME_TEMPLATE: 'resumeTemplate',
  CL_TEMPLATE: 'clTemplate',
};
```

### Step Names
```javascript
CONFIG.STEPS = ['profile', 'job', 'generate', 'settings'];
```

## 📝 Common Customizations

### Change Accent Color
```css
/* In style.css, :root */
--accent: #cc785c;        /* Change this */
--accent-hover: #d98968;  /* Change this too */
```

### Change Spacing
```css
/* In style.css, :root */
--space-md: 16px;  /* Base unit for padding/gaps */
```

### Add New Form Fields
```javascript
// In app-frontend.js, collectProfile()
// Add new input element and include in returned object
```

### Add New Dynamic List
```javascript
// 1. Create HTML in index.html <section id="step-profile">
// 2. Add add{Type}Entry() function
// 3. Update collectProfile() to include new list
// 4. Add button listener in initProfileListeners()
```

## 🚀 Deployment

### Production Checklist
- [ ] Change `BACKEND_URL` to production backend
- [ ] Verify all API endpoints are accessible
- [ ] Test API key validation
- [ ] Test PDF download functionality
- [ ] Test on target browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iPhone, Android)
- [ ] Enable HTTPS (required for https://backend)
- [ ] Configure CORS on backend
- [ ] Minify CSS and JS (optional)
- [ ] Add analytics (optional)

### Server Configuration (nginx example)
```nginx
server {
    listen 80;
    server_name apply-job.com;

    location / {
        root /var/www/website;
        try_files $uri /index.html;  # SPA routing
    }

    location ~* \.(css|js|png|jpg|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker (optional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY website/ .
RUN npm install -g http-server
EXPOSE 3000
CMD ["http-server", "-p", "3000"]
```

## 📚 Documentation

- `FRONTEND.md`: Architecture, file structure, functions
- `DESIGN_GUIDE.md`: Color system, layout, components, accessibility
- `INTEGRATION_GUIDE.md`: API endpoints, data flows, backend contract
- `README.md`: This file (overview and quick start)

## 🐛 Troubleshooting

### Issue: CORS Error
**Solution**: Ensure backend has CORS middleware enabled:
```javascript
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3000' }));
```

### Issue: "API Key not accepted"
**Solution**: Verify API key is valid using /settings → Test API Key button

### Issue: Blank preview panel
**Solution**: Check /api/preview endpoint returns valid HTML

### Issue: localStorage quota exceeded
**Solution**: Clear localStorage: `localStorage.clear()`

### Issue: Styles not loading
**Solution**: Verify `style.css` is in same directory as `index.html`

### Issue: App.js script not found
**Solution**: Verify `app-frontend.js` is in same directory, and index.html references it

## 📄 License

[Your License Here]

## 👨‍💻 Contributing

[Your Contributing Guidelines Here]

## 📧 Support

For issues, questions, or suggestions:
- GitHub Issues: [link]
- Email: [support email]
- Discord: [link]

---

**Status**: Production Ready ✓
**Last Updated**: June 2026
**Node.js Version**: 16+ (for http-server)
**Browser Support**: All modern browsers (Chrome, Firefox, Safari, Edge)
