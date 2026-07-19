/**
 * Usage Examples - Resume & Cover Letter API
 *
 * Complete examples showing how to call the API endpoints
 * from various contexts (Node.js, Browser, fetch, axios, etc.)
 */

// ============================================================================
// EXAMPLE 1: Basic Resume Generation (Node.js)
// ============================================================================

async function generateResumeNodeJS() {
  const fetch = require('node-fetch');

  const request = {
    profile: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/johndoe',
      github: 'https://github.com/johndoe',
      summary: 'Software engineer with 5+ years of experience in full-stack development',
      experience: [
        {
          company: 'TechCorp',
          title: 'Senior Software Engineer',
          startDate: '2021',
          endDate: 'Present',
          description: 'Led development of microservices architecture serving 1M+ users'
        },
        {
          company: 'StartupXYZ',
          title: 'Full Stack Engineer',
          startDate: '2019',
          endDate: '2021',
          description: 'Built cloud infrastructure and APIs'
        }
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'B.S.',
          field: 'Computer Science',
          year: '2019'
        }
      ],
      skills: ['Python', 'JavaScript', 'React', 'Node.js', 'AWS', 'Docker', 'PostgreSQL'],
      projects: [
        {
          name: 'Distributed Tracing System',
          description: 'Built observability platform for microservices'
        }
      ],
      certifications: [
        {
          name: 'AWS Solutions Architect Associate',
          date: '2022'
        }
      ]
    },
    jd: {
      company: 'Acme Inc.',
      jobTitle: 'Senior Engineer',
      description: `We are looking for a senior engineer with experience in building scalable systems...`
    },
    resumeType: 'modern',
    generate: 'resume',
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5-20251001'
  };

  try {
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const { resumeHtml } = await response.json();

    // Save to file
    const fs = require('fs');
    fs.writeFileSync('resume.html', resumeHtml);
    console.log('Resume generated: resume.html');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================================================
// EXAMPLE 2: Generate Both Resume and Cover Letter
// ============================================================================

async function generateBothDocuments() {
  const request = {
    profile: {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1-555-9876',
      location: 'New York, NY',
      summary: 'Data scientist with 4 years of ML experience',
      experience: [
        {
          company: 'DataCorp',
          title: 'ML Engineer',
          startDate: '2020',
          endDate: 'Present',
          description: 'Built recommendation engines and predictive models'
        }
      ],
      education: [
        {
          institution: 'MIT',
          degree: 'M.S.',
          field: 'Computer Science',
          year: '2020'
        }
      ],
      skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'GCP']
    },
    jd: {
      company: 'DataTech AI',
      jobTitle: 'Senior Data Scientist',
      description: 'Looking for a senior data scientist to lead ML initiatives...'
    },
    resumeType: 'classic',
    coverLetterType: 'formal',
    generate: 'both',  // Both resume and cover letter
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5-20251001'
  };

  try {
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const { resumeHtml, coverLetterHtml } = await response.json();

    // Save both files
    const fs = require('fs');
    fs.writeFileSync('resume.html', resumeHtml);
    fs.writeFileSync('cover-letter.html', coverLetterHtml);

    console.log('✓ Resume generated');
    console.log('✓ Cover letter generated');
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 3: Preview Before Generating (No AI Call)
// ============================================================================

async function previewThenGenerate() {
  const profile = {
    fullName: 'Alex Johnson',
    email: 'alex@example.com',
    phone: '+1-555-5555',
    skills: ['Java', 'Spring Boot', 'Kubernetes']
  };

  const jd = {
    company: 'CloudSystems',
    jobTitle: 'Backend Engineer'
  };

  // Step 1: Quick preview (no AI, no cost)
  console.log('Step 1: Generating preview...');
  let response = await fetch('http://localhost:3000/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile,
      jd,
      generate: 'resume',
      resumeType: 'modern'
    })
  });

  const { resumeHtml: previewHtml } = await response.json();
  console.log('Preview generated');
  // Display preview to user, save to file for review
  require('fs').writeFileSync('preview.html', previewHtml);

  // Step 2: If user approves, generate with AI
  console.log('Step 2: Generating with AI...');
  response = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile,
      jd,
      generate: 'resume',
      resumeType: 'modern',
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-haiku-4-5-20251001'
    })
  });

  const { resumeHtml: finalHtml } = await response.json();
  require('fs').writeFileSync('final.html', finalHtml);
  console.log('Final resume generated');
}

// ============================================================================
// EXAMPLE 4: Using Different Providers
// ============================================================================

async function tryMultipleProviders(profile, jd) {
  const providers = [
    {
      name: 'Anthropic',
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-haiku-4-5-20251001'
    },
    {
      name: 'OpenAI',
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o'
    },
    {
      name: 'Groq (Free)',
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      model: 'mixtral-8x7b-32768'
    },
    {
      name: 'DeepSeek (Cheap)',
      provider: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: 'deepseek-chat'
    }
  ];

  for (const { name, provider, apiKey, model } of providers) {
    if (!apiKey) {
      console.log(`⊘ ${name}: API key not set`);
      continue;
    }

    try {
      console.log(`⟳ Generating with ${name}...`);
      const response = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          jd,
          generate: 'resume',
          provider,
          apiKey,
          model
        })
      });

      if (response.ok) {
        const { resumeHtml } = await response.json();
        require('fs').writeFileSync(`resume_${provider}.html`, resumeHtml);
        console.log(`✓ ${name}: Success`);
      } else {
        console.log(`✗ ${name}: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`✗ ${name}: ${error.message}`);
    }
  }
}

// ============================================================================
// EXAMPLE 5: Browser/Frontend Usage
// ============================================================================

async function generateFromBrowser() {
  // This would run in a browser or Electron app

  const generateResume = async (formData) => {
    try {
      const response = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            fullName: formData.name,
            email: formData.email,
            phone: formData.phone,
            skills: formData.skills.split(',').map(s => s.trim())
          },
          jd: {
            company: formData.company,
            jobTitle: formData.jobTitle
          },
          generate: 'resume',
          provider: 'anthropic',
          apiKey: formData.apiKey,
          model: 'claude-haiku-4-5-20251001'
        })
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const { resumeHtml } = await response.json();

      // Display in iframe
      const iframe = document.getElementById('preview');
      iframe.srcDoc = resumeHtml;

      // Provide download link
      const blob = new Blob([resumeHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      document.getElementById('download-link').href = url;
      document.getElementById('download-link').download = 'resume.html';
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Hook up form submission
  document.getElementById('generate-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    generateResume(Object.fromEntries(formData));
  });
}

// ============================================================================
// EXAMPLE 6: Error Handling
// ============================================================================

async function generateWithErrorHandling(request) {
  try {
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      timeout: 30000  // 30 second timeout
    });

    if (!response.ok) {
      const { error } = await response.json();

      if (response.status === 400) {
        // Validation error - fix request
        console.error('Validation error:', error);
        console.log('Check your request body structure');
      } else if (response.status === 500) {
        // Server error - could be AI API issue
        console.error('Server error:', error);

        if (error.includes('API key')) {
          console.log('Check your API key');
        } else if (error.includes('Template')) {
          console.log('Template file missing');
        } else if (error.includes('JSON')) {
          console.log('AI returned invalid JSON, try different model');
        }
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error.message);

    if (error.message.includes('timeout')) {
      console.log('Request timeout - API is slow');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('Server not running - start with: npm start');
    }

    return null;
  }
}

// ============================================================================
// EXAMPLE 7: Batch Generation
// ============================================================================

async function batchGenerate(applications) {
  const results = [];

  for (const app of applications) {
    console.log(`Generating for ${app.company}...`);

    try {
      const response = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: app.profile,
          jd: app.jd,
          generate: 'both',
          resumeType: 'modern',
          coverLetterType: 'formal',
          provider: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-haiku-4-5-20251001'
        })
      });

      if (response.ok) {
        const { resumeHtml, coverLetterHtml } = await response.json();

        const fs = require('fs');
        const dir = `./applications/${app.company}`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(`${dir}/resume.html`, resumeHtml);
        fs.writeFileSync(`${dir}/cover-letter.html`, coverLetterHtml);

        results.push({ company: app.company, status: 'success' });
        console.log(`✓ Generated for ${app.company}`);
      } else {
        results.push({ company: app.company, status: 'failed' });
        console.log(`✗ Failed for ${app.company}`);
      }
    } catch (error) {
      results.push({ company: app.company, status: 'error', error: error.message });
      console.log(`✗ Error for ${app.company}: ${error.message}`);
    }

    // Rate limit - wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// ============================================================================
// EXAMPLE 8: Using Axios
// ============================================================================

async function generateWithAxios() {
  const axios = require('axios');

  try {
    const response = await axios.post('http://localhost:3000/api/generate', {
      profile: {
        fullName: 'Test User',
        email: 'test@example.com'
      },
      jd: {
        company: 'Test Company',
        jobTitle: 'Test Role'
      },
      generate: 'resume',
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-haiku-4-5-20251001'
    });

    console.log('Generated:', response.data.resumeHtml.substring(0, 100) + '...');
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateResumeNodeJS,
  generateBothDocuments,
  previewThenGenerate,
  tryMultipleProviders,
  batchGenerate,
  generateWithErrorHandling,
  generateFromBrowser,
  generateWithAxios
};

// ============================================================================
// CLI USAGE
// ============================================================================

if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'example1':
      generateResumeNodeJS();
      break;
    case 'example2':
      generateBothDocuments();
      break;
    case 'example3':
      previewThenGenerate();
      break;
    case 'help':
    default:
      console.log(`
Usage: node USAGE_EXAMPLES.js [command]

Commands:
  example1  - Basic resume generation
  example2  - Generate resume and cover letter
  example3  - Preview then generate
  help      - Show this help

Environment variables needed:
  ANTHROPIC_API_KEY    - For Anthropic provider
  OPENAI_API_KEY       - For OpenAI provider
  GROQ_API_KEY         - For Groq provider
  DEEPSEEK_API_KEY     - For DeepSeek provider
      `);
  }
}
