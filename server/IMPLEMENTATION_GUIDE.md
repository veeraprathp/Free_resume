# Server Implementation Guide

Complete guide to the Resume & Cover Letter API endpoints.

## Overview

The server provides two core API endpoints for generating job application documents:

1. **POST /api/generate** - AI-tailored resume and cover letter
2. **POST /api/preview** - Template-only preview (no AI)

Both support multiple resume and cover letter styles, multiple AI providers, and comprehensive profile data.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

All required dependencies are already in `package.json`:
- `express` - Web framework
- `handlebars` - Template engine
- `ai` - Unified AI SDK
- `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google` - Provider SDKs
- `cors` - Cross-origin support

### 2. Start Server

```bash
# Development with auto-reload
npm start

# Or directly
node server/index.js
```

Server starts on `http://localhost:3000`

### 3. Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Generate resume (preview mode, no AI)
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {"fullName": "Test User", "email": "test@example.com"},
    "jd": {"company": "Acme", "jobTitle": "Engineer"},
    "generate": "resume"
  }'
```

---

## Architecture

### Request Flow

```
Client Request
     ↓
validate() - Check required fields
     ↓
Build Prompt (for AI routes)
     ↓
callAI() - Call external provider
     ↓
Parse JSON response
     ↓
compileTemplate() - Handlebars compilation
     ↓
Return HTML
```

### File Structure

```
server/
├── index.js                    # Server startup
├── app.js                      # Express app + routes
├── ai.js                       # AI provider abstraction
├── routes/
│   ├── generate.js             # POST /api/generate (AI-tailored)
│   └── preview.js              # POST /api/preview (template-only)
├── prompts/
│   ├── resume.js               # Resume prompt builder
│   └── coverLetter.js          # Cover letter prompt builder
├── templates/
│   ├── resume/
│   │   ├── classic.hbs         # Classic resume style
│   │   ├── modern.hbs          # Modern resume style
│   │   └── minimal.hbs         # Minimal resume style
│   └── cover-letter/
│       ├── formal.hbs          # Formal cover letter
│       ├── conversational.hbs  # Conversational style
│       └── brief.hbs           # Brief/direct style
├── API.md                      # API reference
└── IMPLEMENTATION_GUIDE.md     # This file
```

---

## Endpoint Details

### POST /api/generate

Generates AI-tailored documents by calling an external AI provider.

#### Request Body

```javascript
{
  // User's professional profile
  profile: {
    fullName: string,              // Required
    email?: string,
    phone?: string,
    location?: string,
    linkedin?: string,
    github?: string,
    summary?: string,
    experience?: Array<{
      company: string,
      title: string,
      startDate: string,
      endDate: string,
      description: string
    }>,
    education?: Array<{
      institution: string,
      degree: string,
      field: string,
      year: string
    }>,
    skills?: string[],
    projects?: Array<{ name: string, description: string }>,
    certifications?: Array<{ name: string, date: string }>
  },
  
  // Target job description
  jd: {
    company: string,               // Required
    jobTitle: string,              // Required
    description?: string
  },
  
  // Document configuration
  resumeType?: 'classic' | 'modern' | 'minimal',     // Default: 'classic'
  coverLetterType?: 'formal' | 'conversational' | 'brief',  // Default: 'formal'
  generate: 'resume' | 'cover_letter' | 'both',  // Required
  
  // AI Provider configuration
  provider: string,                // Required: openai, anthropic, gemini, deepseek, openrouter, groq, custom
  apiKey: string,                  // Required
  model: string,                   // Required: e.g., gpt-4o, claude-haiku-4-5-20251001
  baseURL?: string                 // Only for provider='custom'
}
```

#### Response

```javascript
{
  resumeHtml?: string,        // Generated resume HTML (if requested)
  coverLetterHtml?: string,   // Generated cover letter HTML (if requested)
  error?: string              // Error message (on failure)
}
```

#### Implementation

**File**: `server/routes/generate.js`

Key functions:
- `validateRequest()` - Validates required fields
- `compileTemplate()` - Renders Handlebars template with data
- Router handler:
  1. Validate input
  2. Build prompt using `buildResumePrompt()` or `buildCoverLetterPrompt()`
  3. Call AI via `callAI()`
  4. Parse JSON response
  5. Compile template
  6. Return HTML

### POST /api/preview

Generates documents using only templates (no AI calls).

#### Request Body

```javascript
{
  profile: { /* same as /generate */ },
  jd: { /* same as /generate */ },
  resumeType?: string,
  coverLetterType?: string,
  generate: string  // Required
}
```

#### Response

Same as `/api/generate`, but without AI modifications.

#### Implementation

**File**: `server/routes/preview.js`

Key functions:
- `buildResumeHTML()` - Template-only resume rendering
- `buildCoverLetterHTML()` - Template-only cover letter rendering
- Router handler:
  1. Validate input
  2. Directly compile templates with profile data
  3. Return HTML

---

## AI Provider Integration

### callAI() Function

**File**: `server/ai.js`

Unified interface to call any AI provider:

```javascript
const response = await callAI({
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-haiku-4-5-20251001',
  prompt: 'Generate a resume...',
  baseURL: undefined  // Optional
});
```

### Supported Providers

| Provider | Models | Setup |
|----------|--------|-------|
| **OpenAI** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo | API key from openai.com |
| **Anthropic** | claude-opus, claude-sonnet, claude-haiku | API key from console.anthropic.com |
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro | API key from makersuite.google.com |
| **DeepSeek** | deepseek-chat, deepseek-reasoner | API key from platform.deepseek.com |
| **OpenRouter** | 100+ models | API key from openrouter.ai |
| **Groq** | mixtral, gemma, llama | API key from console.groq.com |
| **Custom** | Any | Custom base URL + API key |

### Adding a New Provider

1. Update `server/ai.js`:

```javascript
case 'newprovider':
  const provider = createNewProvider({
    apiKey: apiKey,
    baseURL: baseURL  // if applicable
  });
  languageModel = provider(model);
  break;
```

2. Install provider SDK if needed:

```bash
npm install @ai-sdk/newprovider
```

3. Test with valid credentials

---

## Prompt & Template System

### Prompts

**Resume Prompt** (`server/prompts/resume.js`):

```javascript
buildResumePrompt(resumeType, profile, jd)
```

- Takes resume type (classic/modern/minimal)
- Builds context from profile and JD
- Instructs AI to return specific JSON structure
- Returns: Complete prompt text

**Cover Letter Prompt** (`server/prompts/coverLetter.js`):

```javascript
buildCoverLetterPrompt(letterType, profile, jd)
```

- Takes letter type (formal/conversational/brief)
- Includes personalization instructions
- Returns: Complete prompt text

### JSON Response Format

**From Resume Prompt:**

```javascript
{
  "tailoredSummary": "Professional summary...",
  "tailoredExperience": [
    {
      "company": "...",
      "title": "...",
      "duration": "...",
      "achievements": ["achievement 1", "achievement 2"]
    }
  ],
  "tailoredSkills": ["Skill1", "Skill2"],
  "tailoredEducation": [
    {
      "degree": "...",
      "field": "...",
      "institution": "...",
      "year": "..."
    }
  ],
  "keyHighlights": ["highlight1", "highlight2"]
}
```

**From Cover Letter Prompt:**

```javascript
{
  "opening": "Opening paragraph...",
  "bodyParagraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "closing": "Closing paragraph...",
  "personalizedElements": ["insight1", "insight2"]
}
```

### Templates

Handlebars templates in `server/templates/`:

**Resume templates** render:
- `{{fullName}}`, `{{email}}`, `{{phone}}`
- `{{tailoredSummary}}`
- `{{#each tailoredExperience}}` loop
- `{{#each tailoredEducation}}` loop
- `{{#each tailoredSkills}}`

**Cover letter templates** render:
- `{{fullName}}`, `{{email}}`, `{{phone}}`
- `{{opening}}`
- `{{#each bodyParagraphs}}`
- `{{closing}}`

#### Adding New Styles

1. Create template file: `server/templates/{type}/{style}.hbs`
2. Use same Handlebars variables
3. Update prompts if needed
4. No code changes required

---

## Error Handling

### Validation Errors (400)

```javascript
// Missing required field
{
  "error": "Validation error: Missing required field: profile.fullName"
}

// Invalid generate parameter
{
  "error": "Validation error: Invalid generate parameter. Must be \"resume\", \"cover_letter\", or \"both\""
}
```

### AI Errors (500)

```javascript
// API call failed
{
  "error": "Generation failed: AI call failed: Invalid API key"
}

// Invalid JSON response
{
  "error": "Generation failed: Failed to parse AI response as JSON: Unexpected token"
}
```

### Template Errors (500)

```javascript
// Missing template
{
  "error": "Generation failed: Template compilation failed: ENOENT: no such file or directory"
}

// Handlebars error
{
  "error": "Generation failed: Template compilation failed: Unknown helper ..."
}
```

### Debug Logging

Both routes log to console:

```
[GENERATE] Received request
[GENERATE] Requested documents: both
[GENERATE] Building resume prompt...
[GENERATE] Calling AI for resume...
[GENERATE] Parsing AI response for resume...
[GENERATE] Compiling resume template...
[GENERATE] Resume generated successfully
[GENERATE] Request completed successfully
```

---

## Usage Examples

### Basic Resume Generation

```javascript
const response = await fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profile: {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-0123',
      skills: ['Python', 'React', 'AWS']
    },
    jd: {
      company: 'TechCorp',
      jobTitle: 'Senior Engineer',
      description: 'Looking for a senior full-stack engineer...'
    },
    generate: 'resume',
    resumeType: 'modern',
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5-20251001'
  })
});

const { resumeHtml } = await response.json();
// resumeHtml contains complete resume HTML
```

### Preview Before Generating

```javascript
// Step 1: Preview template
const previewResponse = await fetch('http://localhost:3000/api/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profile: { fullName: 'Jane Smith', email: 'jane@example.com' },
    jd: { company: 'TechCorp', jobTitle: 'Engineer' },
    generate: 'resume'
  })
});

const { resumeHtml } = await previewResponse.json();
// Display in iframe to review formatting

// Step 2: Generate with AI if happy with preview
const aiResponse = await fetch('http://localhost:3000/api/generate', {
  // ... same as above but with AI config
});
```

### Multiple Formats

```javascript
// Generate all combinations
const response = await fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profile: { /* ... */ },
    jd: { /* ... */ },
    generate: 'both',           // Both resume and cover letter
    resumeType: 'modern',
    coverLetterType: 'conversational',
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5-20251001'
  })
});

const { resumeHtml, coverLetterHtml } = await response.json();
```

---

## Performance Considerations

### Caching

Implement client-side caching:

```javascript
// Cache generated documents by hash of input
const hash = md5(JSON.stringify(requestBody));
const cached = localStorage.getItem(`doc_${hash}`);
if (cached) return cached;
```

### Cost Optimization

| Provider | Cost per Request | Optimization |
|----------|-----------------|--------------|
| OpenAI | ~$0.15 | Use gpt-3.5-turbo for drafts |
| Anthropic | ~$0.01 | Use Haiku for quick generations |
| Gemini | Free tier | Use for development |
| DeepSeek | ~$0.001 | Cheapest option |
| Groq | Free | Perfect for testing |

### Streaming (Future)

Current implementation waits for complete AI response. Consider streaming for large documents:

```javascript
// Future: Implement streaming
app.post('/api/generate-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  // Stream HTML chunks as they're generated
});
```

---

## Testing

### Unit Tests (Mock AI)

```javascript
// Mock callAI to avoid API calls
jest.mock('../ai.js');
const { callAI } = require('../ai.js');

callAI.mockResolvedValue(JSON.stringify({
  tailoredSummary: 'Test summary'
}));

const response = await request(app)
  .post('/api/generate')
  .send({ /* ... */ });

expect(response.status).toBe(200);
```

### Integration Tests (Real API)

```bash
# Test with real Anthropic API
export ANTHROPIC_API_KEY=sk-ant-...
npm test -- --testNamePattern="integration"
```

### Manual Testing

```bash
# Full request test
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {"fullName": "Test", "email": "test@test.com"},
    "jd": {"company": "Acme", "jobTitle": "Engineer"},
    "generate": "resume",
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-haiku-4-5-20251001"
  }' | jq '.resumeHtml' | head -20
```

---

## Deployment

### Environment Variables

```bash
PORT=3000                        # Server port
NODE_ENV=production              # Environment
ANTHROPIC_API_KEY=sk-ant-...     # Optional default
OPENAI_API_KEY=sk-...            # Optional default
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server/index.js"]
```

```bash
docker build -t applyjob-server .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... applyjob-server
```

### Vercel/Netlify

For serverless:

```javascript
// api/generate.js (Vercel)
const app = require('../server/app.js');
module.exports = app;
```

---

## Next Steps

1. **Integration**: Mount routes in main Express app
2. **Testing**: Add test suite for endpoints
3. **Documentation**: Generate API docs with Swagger
4. **UI**: Build frontend client for endpoints
5. **Caching**: Implement Redis cache for generated docs
6. **Monitoring**: Add error tracking (Sentry)
7. **Rate Limiting**: Add API rate limiting
8. **Analytics**: Track generation metrics

---

## Support & Debugging

### Common Issues

**"Template not found"**
- Check template file path
- Ensure Handlebars files have `.hbs` extension

**"Invalid API key"**
- Verify correct provider API key
- Check API key hasn't expired
- Ensure key has correct permissions

**"JSON parse error"**
- AI returned incomplete or invalid JSON
- Try with different model
- Check prompt formatting

**"Connection timeout"**
- Check internet connection
- Verify API endpoint is reachable
- Increase timeout if needed

### Logging

Enable detailed logging:

```javascript
// In app.js
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});
```

---

## API Reference

See `API.md` for complete endpoint documentation.
