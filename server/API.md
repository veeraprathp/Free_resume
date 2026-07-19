# ApplyJob API Documentation

Core API endpoints for resume and cover letter generation with AI tailoring.

## Server Setup

### Starting the Server

```bash
# Development
npm start

# Or directly
node server/index.js
```

Server runs on `http://localhost:3000` by default. Set `PORT` environment variable to change.

### Available Endpoints

- `GET /health` - Health check
- `POST /api/generate` - Generate with AI tailoring
- `POST /api/preview` - Quick preview without AI

---

## 1. POST /api/generate

Generate resume and/or cover letter with AI tailoring.

### Request

```json
{
  "profile": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe",
    "summary": "Software engineer with 5 years of experience",
    "experience": [
      {
        "company": "Tech Corp",
        "title": "Senior Engineer",
        "startDate": "2021",
        "endDate": "Present",
        "description": "Led development of microservices architecture"
      }
    ],
    "education": [
      {
        "institution": "University of Example",
        "degree": "B.S.",
        "field": "Computer Science",
        "year": "2018"
      }
    ],
    "skills": ["Python", "JavaScript", "AWS", "Docker"],
    "projects": [
      {
        "name": "Project Alpha",
        "description": "Built a distributed system"
      }
    ],
    "certifications": [
      {
        "name": "AWS Solutions Architect",
        "date": "2022"
      }
    ]
  },
  "jd": {
    "company": "Acme Inc.",
    "jobTitle": "Software Engineer",
    "description": "We are looking for a senior engineer with experience in microservices and cloud technologies..."
  },
  "resumeType": "classic",
  "coverLetterType": "formal",
  "generate": "both",
  "provider": "anthropic",
  "apiKey": "your-api-key",
  "model": "claude-haiku-4-5-20251001",
  "baseURL": "https://api.example.com"
}
```

### Request Parameters

#### Required

| Field | Type | Description |
|-------|------|-------------|
| `profile.fullName` | string | Full name |
| `jd.company` | string | Company name |
| `jd.jobTitle` | string | Job title |
| `provider` | string | AI provider: `openai`, `anthropic`, `gemini`, `deepseek`, `openrouter`, `groq`, `custom` |
| `apiKey` | string | API key for the provider |
| `model` | string | Model ID (e.g., `gpt-4o`, `claude-haiku-4-5-20251001`) |
| `generate` | string | What to generate: `resume`, `cover_letter`, or `both` |

#### Optional

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `resumeType` | string | `classic` | Resume style: `classic`, `modern`, `minimal` |
| `coverLetterType` | string | `formal` | Letter style: `formal`, `conversational`, `brief` |
| `baseURL` | string | Provider default | Custom base URL (required for `provider=custom`) |
| `profile.email` | string | - | Email address |
| `profile.phone` | string | - | Phone number |
| `profile.location` | string | - | Location |
| `profile.linkedin` | string | - | LinkedIn URL |
| `profile.github` | string | - | GitHub URL |
| `profile.summary` | string | - | Professional summary |
| `profile.experience` | array | `[]` | Work experience |
| `profile.education` | array | `[]` | Education |
| `profile.skills` | array | `[]` | Skills list |
| `profile.projects` | array | `[]` | Projects |
| `profile.certifications` | array | `[]` | Certifications |
| `jd.description` | string | - | Full job description |

### Response

**Success (200):**

```json
{
  "resumeHtml": "<html>...</html>",
  "coverLetterHtml": "<html>...</html>"
}
```

Returns only the requested documents:
- If `generate="resume"`: only `resumeHtml`
- If `generate="cover_letter"`: only `coverLetterHtml`
- If `generate="both"`: both fields

**Error (400/500):**

```json
{
  "error": "Validation error: Missing required field: profile.fullName"
}
```

### Supported Providers

1. **OpenAI**
   - Models: `gpt-4o`, `gpt-4-turbo`, etc.
   - Requires: OpenAI API key
   
2. **Anthropic**
   - Models: `claude-opus-4-1`, `claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001`
   - Requires: Anthropic API key
   
3. **Google Gemini**
   - Models: `gemini-2.0-flash`, `gemini-1.5-pro`, etc.
   - Requires: Google AI API key
   
4. **DeepSeek**
   - Models: `deepseek-chat`, `deepseek-reasoner`
   - Requires: DeepSeek API key
   - Uses: OpenAI-compatible endpoint
   
5. **OpenRouter**
   - Models: Any model on OpenRouter (e.g., `openai/gpt-4`)
   - Requires: OpenRouter API key
   
6. **Groq**
   - Models: `mixtral-8x7b-32768`, `gemma-7b-it`, etc.
   - Requires: Groq API key
   - Uses: OpenAI-compatible endpoint
   
7. **Custom**
   - Models: Any model your endpoint supports
   - Requires: API key + `baseURL`
   - Uses: OpenAI-compatible endpoint

### Resume Types

- **classic**: Traditional, professional layout with clear sections
- **modern**: Contemporary design with accent colors and refined typography
- **minimal**: Clean, ATS-friendly single-column layout

### Cover Letter Types

- **formal**: Traditional business letter format with formal tone
- **conversational**: Friendly, personable tone with natural language
- **brief**: Concise, direct format focusing on key qualifications

### Example cURL Request

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "fullName": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1-555-9876",
      "location": "New York, NY",
      "summary": "Data scientist with 3 years of experience",
      "skills": ["Python", "TensorFlow", "SQL"]
    },
    "jd": {
      "company": "DataTech",
      "jobTitle": "Data Scientist",
      "description": "Looking for a data scientist..."
    },
    "generate": "resume",
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-haiku-4-5-20251001"
  }'
```

---

## 2. POST /api/preview

Quick preview without AI calls (template-only, fast).

### Request

```json
{
  "profile": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "skills": ["Python", "JavaScript"]
  },
  "jd": {
    "company": "Acme Inc.",
    "jobTitle": "Software Engineer"
  },
  "resumeType": "modern",
  "coverLetterType": "conversational",
  "generate": "both"
}
```

### Request Parameters

#### Required

| Field | Type | Description |
|-------|------|-------------|
| `profile.fullName` | string | Full name |
| `jd.company` | string | Company name |
| `jd.jobTitle` | string | Job title |
| `generate` | string | What to generate: `resume`, `cover_letter`, or `both` |

#### Optional

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `resumeType` | string | `classic` | Resume style: `classic`, `modern`, `minimal` |
| `coverLetterType` | string | `formal` | Letter style: `formal`, `conversational`, `brief` |
| All other profile fields | - | - | See `/api/generate` |

### Response

Same as `/api/generate`:

```json
{
  "resumeHtml": "<html>...</html>",
  "coverLetterHtml": "<html>...</html>"
}
```

### Use Cases

- Quick preview before spending API tokens
- Testing template formatting
- Offline generation with raw profile data

---

## Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 400 | `Validation error: Missing required field` | Check request body |
| 400 | `Invalid generate parameter` | Use `resume`, `cover_letter`, or `both` |
| 500 | `AI call failed: ...` | Check API key, provider, model |
| 500 | `Template compilation failed: ...` | Ensure template files exist |
| 500 | `Failed to parse AI response as JSON` | AI returned invalid JSON |

### Debugging

Enable detailed logging by checking console output:

```
[GENERATE] Received request
[GENERATE] Requested documents: both
[GENERATE] Building resume prompt...
[GENERATE] Calling AI for resume...
[GENERATE] Parsing AI response for resume...
```

---

## Rate Limits & Token Usage

- **No server-side rate limiting** (implement at client)
- **AI costs**: Varies by provider
  - OpenAI: ~$0.15 per request
  - Anthropic: ~$0.01 per request
  - Google Gemini: Free tier available
  - DeepSeek: ~$0.001 per request
  - Groq: Free tier available

### Cost Optimization

- Use `/api/preview` for initial reviews
- Use smaller models (Haiku, Gemini Flash) for drafts
- Cache generated documents
- Use streaming for long documents

---

## Architecture

### Flow: /api/generate

```
Request → Validate → Build Prompt → Call AI → Parse JSON → Compile Template → Return HTML
```

### AI Provider Abstraction

All providers use the `callAI()` function in `server/ai.js`:

```javascript
const response = await callAI({
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-haiku-4-5-20251001',
  prompt: resumePrompt,
  baseURL: undefined // optional
});
```

Supports OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Groq, and custom endpoints.

### Prompt Templates

- **Resume**: `server/prompts/resume.js` → `buildResumePrompt(type, profile, jd)`
- **Cover Letter**: `server/prompts/coverLetter.js` → `buildCoverLetterPrompt(type, profile, jd)`

Prompts instruct AI to return JSON with fields like:
- `tailoredSummary`, `tailoredExperience`, `tailoredSkills`, `tailoredEducation`
- `opening`, `bodyParagraphs`, `closing`

### Handlebars Templates

- **Resume**: `server/templates/resume/{classic,modern,minimal}.hbs`
- **Cover Letter**: `server/templates/cover-letter/{formal,conversational,brief}.hbs`

Data structure for templates:
```javascript
{
  fullName: "...",
  email: "...",
  tailoredSummary: "...",
  tailoredExperience: [{ company, title, duration, achievements }],
  tailoredEducation: [{ degree, field, institution, year }],
  tailoredSkills: ["..."],
  company: "...",
  jobTitle: "..."
}
```

---

## Files

```
server/
├── index.js              # Server entry point
├── app.js                # Express app setup
├── ai.js                 # AI provider abstraction
├── API.md                # This file
├── routes/
│   ├── generate.js       # POST /api/generate
│   └── preview.js        # POST /api/preview
├── prompts/
│   ├── resume.js         # buildResumePrompt()
│   └── coverLetter.js    # buildCoverLetterPrompt()
└── templates/
    ├── resume/
    │   ├── classic.hbs
    │   ├── modern.hbs
    │   └── minimal.hbs
    └── cover-letter/
        ├── formal.hbs
        ├── conversational.hbs
        └── brief.hbs
```

---

## Development

### Adding a New Provider

1. Update `server/ai.js` - Add case in `callAI()`
2. Test with a valid API key
3. Document in this file

### Adding a New Template

1. Create `server/templates/{type}/{name}.hbs`
2. Use Handlebars syntax for dynamic fields
3. Update prompt to return matching JSON fields

### Testing

```bash
# Start server
npm start

# In another terminal, test:
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"profile":{"fullName":"Test"},"jd":{"company":"Test","jobTitle":"Test"},"generate":"resume"}'
```

---

## License

Part of ApplyJob system.
