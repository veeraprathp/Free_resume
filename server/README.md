# ApplyJob Server - API Endpoints

Complete Express.js API for generating AI-tailored resumes and cover letters.

## Quick Start

```bash
# Start server
npm start

# Server runs on http://localhost:3000
```

## Endpoints

### POST /api/generate
Generate AI-tailored resume and/or cover letter.

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {"fullName": "John", "email": "john@example.com"},
    "jd": {"company": "Acme", "jobTitle": "Engineer"},
    "generate": "resume",
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-haiku-4-5-20251001"
  }'
```

### POST /api/preview
Quick preview without AI (template-only).

```bash
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {"fullName": "John"},
    "jd": {"company": "Acme", "jobTitle": "Engineer"},
    "generate": "resume"
  }'
```

### GET /health
Health check.

```bash
curl http://localhost:3000/health
```

## Features

- **Multiple Providers**: OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Groq, Custom
- **Resume Styles**: Classic, Modern, Minimal
- **Cover Letter Styles**: Formal, Conversational, Brief
- **AI Tailoring**: Automatically tailors documents to job descriptions
- **Template Rendering**: Handlebars-based HTML generation
- **Error Handling**: Comprehensive validation and error responses

## File Structure

```
server/
├── index.js                      # Server startup
├── app.js                        # Express app
├── ai.js                         # AI provider abstraction
├── routes/
│   ├── generate.js               # /api/generate endpoint
│   └── preview.js                # /api/preview endpoint
├── prompts/
│   ├── resume.js                 # Resume prompt builder
│   └── coverLetter.js            # Cover letter prompt builder
├── templates/
│   ├── resume/
│   │   ├── classic.hbs
│   │   ├── modern.hbs
│   │   └── minimal.hbs
│   └── cover-letter/
│       ├── formal.hbs
│       ├── conversational.hbs
│       └── brief.hbs
├── API.md                        # API documentation
├── IMPLEMENTATION_GUIDE.md       # Implementation details
├── USAGE_EXAMPLES.js             # Code examples
└── README.md                     # This file
```

## Configuration

### Environment Variables

```bash
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production         # Environment
```

### API Keys (Client-provided)

Pass via request body:

```json
{
  "provider": "anthropic",
  "apiKey": "sk-ant-...",
  "model": "claude-haiku-4-5-20251001"
}
```

## Request/Response Format

### Request Body

```javascript
{
  profile: {
    fullName: string,
    email?: string,
    phone?: string,
    location?: string,
    linkedin?: string,
    github?: string,
    summary?: string,
    experience?: Array<{company, title, startDate, endDate, description}>,
    education?: Array<{institution, degree, field, year}>,
    skills?: string[],
    projects?: Array<{name, description}>,
    certifications?: Array<{name, date}>
  },
  jd: {
    company: string,
    jobTitle: string,
    description?: string
  },
  resumeType?: 'classic' | 'modern' | 'minimal',
  coverLetterType?: 'formal' | 'conversational' | 'brief',
  generate: 'resume' | 'cover_letter' | 'both',
  provider?: string,        // /api/generate only
  apiKey?: string,         // /api/generate only
  model?: string,          // /api/generate only
  baseURL?: string         // /api/generate only (custom provider)
}
```

### Response

```javascript
{
  resumeHtml?: string,
  coverLetterHtml?: string,
  error?: string
}
```

## Supported AI Providers

| Provider | Model Examples | Cost |
|----------|---|---|
| **Anthropic** | claude-opus, claude-sonnet, claude-haiku | $0.01-0.10 |
| **OpenAI** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo | $0.15-3.00 |
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro | Free-0.05 |
| **DeepSeek** | deepseek-chat, deepseek-reasoner | $0.001-0.01 |
| **OpenRouter** | 100+ models | Varies |
| **Groq** | mixtral, gemma, llama | Free |
| **Custom** | Any OpenAI-compatible | Varies |

## Documentation

- **API.md** - Complete API reference with examples
- **IMPLEMENTATION_GUIDE.md** - Architecture, setup, and integration
- **USAGE_EXAMPLES.js** - Runnable code examples for different scenarios

## Examples

### Generate Resume with Anthropic

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
      jobTitle: 'Senior Engineer'
    },
    generate: 'resume',
    resumeType: 'modern',
    provider: 'anthropic',
    apiKey: 'sk-ant-...',
    model: 'claude-haiku-4-5-20251001'
  })
});

const { resumeHtml } = await response.json();
```

### Preview Before Generating

```javascript
// Step 1: Quick preview (no AI)
const previewRes = await fetch('http://localhost:3000/api/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profile: { fullName: 'Jane' },
    jd: { company: 'TechCorp', jobTitle: 'Engineer' },
    generate: 'resume'
  })
});

// Step 2: Generate with AI if approved
const genRes = await fetch('http://localhost:3000/api/generate', {
  // ... with AI config
});
```

### Batch Generate Applications

See USAGE_EXAMPLES.js for complete batch generation example.

## Error Handling

### Validation Errors (400)

```json
{
  "error": "Validation error: Missing required field: profile.fullName"
}
```

### AI Errors (500)

```json
{
  "error": "Generation failed: AI call failed: Invalid API key"
}
```

### Debug

Check console logs for detailed error traces.

## Performance

- **Preview endpoint**: ~100ms (no AI)
- **Generate endpoint**: 5-30 seconds depending on provider
- **Supported file size**: Up to 10MB request body
- **Template rendering**: <100ms

## Cost Optimization

1. Use /api/preview for formatting checks (free, no API call)
2. Start with smaller models (Haiku, Gemini Flash)
3. Use DeepSeek for lowest cost (~$0.001/request)
4. Implement caching for repeated generations
5. Use Groq or Gemini free tier for testing

## Security

- API keys passed in request body (client responsibility)
- No keys stored on server
- CORS enabled for cross-origin requests
- JSON request limit: 10MB
- Error responses don't expose sensitive data

## Deployment

### Docker

```bash
docker build -t applyjob-server .
docker run -p 3000:3000 applyjob-server
```

### Vercel/Netlify

Mount Express app as serverless function.

### Self-hosted

```bash
npm install
npm start
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Template not found" | Check template file path exists |
| "Invalid API key" | Verify correct API key for provider |
| "JSON parse error" | AI returned invalid JSON, try different model |
| "Connection refused" | Ensure server is running: npm start |
| "CORS error" | Server has CORS enabled, check origin |

## Next Steps

1. Integrate with frontend UI
2. Add test suite
3. Implement rate limiting
4. Add request caching
5. Set up monitoring/logging
6. Deploy to production

## Support

- See API.md for complete endpoint documentation
- See IMPLEMENTATION_GUIDE.md for architecture details
- See USAGE_EXAMPLES.js for code samples
- Check console logs for debugging

---

Made with ApplyJob
