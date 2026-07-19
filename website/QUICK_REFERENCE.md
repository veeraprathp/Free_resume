# Quick Reference Card

## 🚀 Start Here

1. **Run Frontend**: `python -m http.server 3000 -d website/`
2. **Run Backend**: Ensure `http://localhost:3001/api/*` endpoints are live
3. **Open Browser**: `http://localhost:3000`
4. **Fill Profile**: Step 1 — basic info + skills + experience
5. **Paste Job**: Step 2 — analyze keywords
6. **Select Templates**: Step 3 — choose design
7. **Configure API**: Step 4 — API key + provider
8. **Generate**: Click "Generate with AI"
9. **Download**: Get resume + cover letter PDFs

## 📂 Files

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 190 | HTML structure & forms |
| `style.css` | 504 | Design system, all styles |
| `app-frontend.js` | 630 | SPA logic, state management |
| `README.md` | 346 | Quick start guide |
| `FRONTEND.md` | 372 | Architecture reference |
| `DESIGN_GUIDE.md` | 405 | Design system details |
| `INTEGRATION_GUIDE.md` | 520 | Backend API contract |
| `STRUCTURE.md` | 457 | File structure & flow |

## 🎨 Colors

```
Primary:     #1a1a1a  (background)
Card:        #262626  (panels)
Input:       #2f2f2f  (forms)
Text:        #ececec  (main)
Secondary:   #a3a3a3  (labels)
Accent:      #cc785c  (buttons) ← ORANGE-UMBER
Success:     #22c55e  (green)
Error:       #ef4444  (red)
```

## 🔑 Key Functions

### Navigation
```javascript
goToStep(0)  // Go to profile
goToStep(1)  // Go to job
goToStep(2)  // Go to generate
goToStep(3)  // Go to settings
```

### Profile Management
```javascript
collectProfile()      // Get form data
saveProfile()         // Save to localStorage
loadProfile()         // Restore from localStorage
addExperienceEntry()  // Add job entry
```

### Job Analysis
```javascript
analyzeKeywords()     // POST /api/analyze-keywords
```

### Generation
```javascript
previewDocuments()    // POST /api/preview (no AI)
generateDocuments()   // POST /api/generate (with AI)
downloadResume()      // POST /api/pdf
downloadCoverLetter() // POST /api/pdf
```

### Settings
```javascript
testApiKey()          // POST /api/test-api
saveSettings()        // Save API config
updateApiStatus()     // Update sidebar indicator
```

## 💾 Data Keys

```javascript
localStorage.getItem('profile')      // User profile
localStorage.getItem('jd')           // Job description
localStorage.getItem('settings')     // API config
localStorage.getItem('resumeTemplate')
localStorage.getItem('clTemplate')
```

## 🔌 API Endpoints

```
POST /api/analyze-keywords     Analyze job description
POST /api/preview              Template preview (no AI)
POST /api/generate             Generate with AI
POST /api/test-api            Test API credentials
POST /api/pdf                 HTML → PDF download
```

## 🎯 CSS Classes

| Element | Classes |
|---------|---------|
| Sidebar | `.sidebar` |
| Nav Button | `.nav-btn`, `.nav-btn.active` |
| Main Content | `.main-content` |
| Step Panel | `.step-content`, `.step-content.active` |
| Form Section | `.form-section` |
| Input | `.form-input` |
| Button | `.btn`, `.btn-primary`, `.btn-secondary` |
| Template Card | `.template-card`, `.template-card.selected` |
| Entry | `.entry-container`, `.entry-row` |
| Preview | `.preview-sidebar`, `.preview-tab`, `.preview-iframe` |

## 🔄 State Object

```javascript
appState = {
  currentStep: 0,
  profile: { fullName, email, phone, ... },
  jd: { company, title, description, ... },
  settings: { aiProvider, aiModel, apiKey, ... },
  resumeTemplate: 'classic',
  clTemplate: 'formal',
  generatedResume: null,
  generatedCoverLetter: null,
}
```

## 📱 Responsive Breakpoints

```css
/* Desktop (default) */
3-column layout: sidebar (280px) | main | preview (320px)

/* Tablet (@media max-width: 1200px) */
1-column: horizontal sticky header, main full width, preview below

/* Mobile (@media max-width: 768px) */
1-column: buttons stack, single column forms, single column templates
```

## ✅ Form Fields

### Step 1: Profile
- Basic: fullName, email, phone, location, linkedin, github
- Summary: summary (textarea)
- Skills: skillLanguages, skillAIML, skillBackend, skillCloud, skillFrontend, skillHumanLangs
- Lists: experience[], education[], projects[], certifications[]

### Step 2: Job
- jdCompany, jdTitle, jdLocation
- jdText (textarea)

### Step 3: Generate
- resumeTemplate: 'classic', 'modern', 'minimal'
- clTemplate: 'formal', 'conversational', 'brief'
- clCustomInstructions (textarea)

### Step 4: Settings
- aiProvider: 'openai', 'anthropic', 'gemini', 'deepseek', 'openrouter', 'groq', 'custom'
- customBaseURL (conditional)
- aiModel (string)
- apiKey (password)

## 🎬 Common Tasks

### Change Backend URL
```javascript
// In app-frontend.js
CONFIG.BACKEND_URL = 'http://localhost:3001/api'  // Change this
```

### Change Color Scheme
```css
/* In style.css, :root */
--accent: #cc785c;  /* Change to any hex color */
```

### Add New Dynamic List
```javascript
// 1. Add HTML in index.html
// 2. Create add{Type}Entry() function
// 3. Update collectProfile()
// 4. Update loadProfile()
// 5. Add listener in initProfileListeners()
```

### Debug App State
```javascript
// In DevTools Console
console.log(appState)
console.log(appState.profile)
localStorage.getItem('profile')
```

## 🚨 Common Errors

| Error | Solution |
|-------|----------|
| CORS error | Enable CORS on backend |
| API key rejected | Test with correct API key |
| Blank preview | Verify /api/preview returns HTML |
| localStorage full | `localStorage.clear()` |
| Styles not loading | Verify style.css exists & is linked |
| Functions not found | Verify app-frontend.js is linked |

## 📊 Performance

- HTML: 9 KB
- CSS: 11 KB
- JS: 24 KB
- **Total: ~44 KB** (very light)
- Load time: < 1 second (on fast connection)
- No external dependencies (fonts, CDN, etc.)

## 🔐 Security Notes

- API keys stored in localStorage (user's device, not sent to server)
- No sensitive data stored
- HTTPS recommended for production
- Backend should validate all inputs
- Consider rate limiting on /api/generate

## 📞 Support

- Check `README.md` for quick start
- Check `INTEGRATION_GUIDE.md` for API details
- Check `DESIGN_GUIDE.md` for styling
- Check `FRONTEND.md` for function reference
- Check DevTools Console for errors
- Check Network tab for API requests

## 🎓 Learning Resources

- **CSS Grid**: CSS layout system used for main layout
- **Flexbox**: Used for buttons, nav, form groups
- **localStorage**: Browser data persistence
- **Fetch API**: Backend communication
- **async/await**: Promise handling in JS
- **Document API**: DOM manipulation

## 📝 Notes

- All data persists in localStorage (survives page refresh)
- All API calls are async (don't block UI)
- Errors are caught and displayed to user
- No console errors (except API failures)
- Mobile-responsive (test on phone)
- Dark theme only (no light mode)
- Keyboard accessible (tab navigation)

---

**Quick Links:**
- Start: `python -m http.server 3000 -d website/`
- Docs: README.md → FRONTEND.md → DESIGN_GUIDE.md → INTEGRATION_GUIDE.md
- Code: index.html → style.css → app-frontend.js
- Debug: DevTools Console + Network tab
