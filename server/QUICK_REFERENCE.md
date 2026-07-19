# Quick Reference - API Endpoints

## Start Server
```bash
npm start
# Runs on http://localhost:3000
```

## Health Check
```bash
curl http://localhost:3000/health
```

## POST /api/preview (Fast, No AI)

Generate preview without AI calls.

```bash
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "555-0123",
      "skills": ["Python", "React"]
    },
    "jd": {
      "company": "TechCorp",
      "jobTitle": "Engineer"
    },
    "resumeType": "modern",
    "generate": "resume"
  }'
```

## POST /api/generate (With AI)

Generate AI-tailored documents.

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "555-0123",
      "summary": "Senior engineer with 5 years experience",
      "experience": [
        {
          "company": "TechCorp",
          "title": "Engineer",
          "startDate": "2020",
          "endDate": "Present",
          "description": "Built scalable systems"
        }
      ],
      "education": [
        {
          "institution": "MIT",
          "degree": "B.S.",
          "field": "Computer Science",
          "year": "2020"
        }
      ],
      "skills": ["Python", "React", "AWS"]
    },
    "jd": {
      "company": "Acme Inc.",
      "jobTitle": "Senior Engineer",
      "description": "Looking for senior engineer with cloud experience..."
    },
    "generate": "both",
    "resumeType": "modern",
    "coverLetterType": "conversational",
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-haiku-4-5-20251001"
  }'
```

## Resume Types
- `classic` - Traditional professional
- `modern` - Contemporary with color
- `minimal` - ATS-friendly

## Cover Letter Types
- `formal` - Business letter format
- `conversational` - Friendly tone
- `brief` - Concise, direct

## Generate Parameter
- `resume` - Only resume
- `cover_letter` - Only cover letter
- `both` - Both documents

## AI Providers

| Provider | API Key Env | Model Examples |
|----------|---|---|
| anthropic | ANTHROPIC_API_KEY | claude-haiku-4-5-20251001 |
| openai | OPENAI_API_KEY | gpt-4o |
| gemini | GOOGLE_AI_API_KEY | gemini-2.0-flash |
| deepseek | - | deepseek-chat |
| openrouter | - | openai/gpt-4 |
| groq | - | mixtral-8x7b-32768 |
| custom | - | (any model) |

## Response Format

**Success (200):**
```json
{
  "resumeHtml": "<html>...</html>",
  "coverLetterHtml": "<html>...</html>"
}
```

**Error (400/500):**
```json
{
  "error": "Error message describing what went wrong"
}
```

## Required Fields

### /api/generate
- `profile.fullName`
- `jd.company`
- `jd.jobTitle`
- `provider`
- `apiKey`
- `model`
- `generate`

### /api/preview
- `profile.fullName`
- `jd.company`
- `jd.jobTitle`
- `generate`

## Optional Fields

```javascript
profile: {
  email, phone, location, linkedin, github,
  summary, experience[], education[], 
  skills[], projects[], certifications[]
}

jd: {
  description
}

// Global options
resumeType,           // default: 'classic'
coverLetterType,      // default: 'formal'
baseURL               // for custom provider only
```

## Common Errors

| Error | Solution |
|-------|----------|
| Missing required field | Add fullName, company, jobTitle |
| Invalid API key | Check provider API key is correct |
| Template not found | Ensure template file exists |
| JSON parse error | AI returned invalid JSON, try different model |

## File Locations

```
server/
├── index.js                    # Start here
├── app.js                      # Express app
├── ai.js                       # Provider abstraction
├── routes/
│   ├── generate.js             # POST /api/generate
│   └── preview.js              # POST /api/preview
├── prompts/
│   ├── resume.js               # Resume prompts
│   └── coverLetter.js          # Cover letter prompts
├── templates/
│   ├── resume/
│   │   ├── classic.hbs
│   │   ├── modern.hbs
│   │   └── minimal.hbs
│   └── cover-letter/
│       ├── formal.hbs
│       ├── conversational.hbs
│       └── brief.hbs
├── README.md                   # Quick start
├── API.md                      # Complete docs
├── IMPLEMENTATION_GUIDE.md     # Deep dive
└── USAGE_EXAMPLES.js           # Code examples
```

## JavaScript Example

```javascript
// Generate resume with Anthropic
const response = await fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profile: {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      skills: ['Python', 'React']
    },
    jd: {
      company: 'TechCorp',
      jobTitle: 'Engineer'
    },
    generate: 'resume',
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5-20251001'
  })
});

const { resumeHtml } = await response.json();
console.log(resumeHtml);
```

## Docker

```bash
# Build
docker build -t applyjob-server .

# Run
docker run -p 3000:3000 applyjob-server
```

## Environment Variables

```bash
PORT=3000                    # Server port
NODE_ENV=production         # Environment
```

## Documentation

- **README.md** - Overview and quick start
- **API.md** - Complete API documentation
- **IMPLEMENTATION_GUIDE.md** - Architecture and setup
- **USAGE_EXAMPLES.js** - Runnable code examples
- **QUICK_REFERENCE.md** - This file

## Debug Logging

Server logs all requests and operations:

```
[2024-01-15T10:30:45.123Z] POST /api/generate
[GENERATE] Received request
[GENERATE] Building resume prompt...
[GENERATE] Calling AI for resume...
[GENERATE] Resume generated successfully
```

Check console output for troubleshooting.

---

For more info: see README.md, API.md, or IMPLEMENTATION_GUIDE.md
