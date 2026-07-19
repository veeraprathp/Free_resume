/**
 * AI Provider Abstraction Layer
 * Routes all requests through a local Portkey AI Gateway (open source, Apache 2.0),
 * which translates the OpenAI request format to 1,600+ models across every major
 * provider. BYOK: the user's API key travels per-request in headers and is never
 * stored. Gateway is spawned alongside the server in index.js.
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8787';

// Our UI provider names -> Portkey provider slugs.
// Anything not listed is passed through verbatim, so any valid Portkey slug
// (azure-openai, bedrock, vertex-ai, cohere, x-ai, ...) works out of the box.
const PROVIDER_SLUGS = {
  'gemini': 'google',
  'mistral': 'mistral-ai',
  'together': 'together-ai',
  'perplexity': 'perplexity-ai',
  'fireworks': 'fireworks-ai',
  'grok': 'x-ai',
};

// Providers that are OpenAI-compatible servers at a caller-supplied URL
const CUSTOM_HOST_PROVIDERS = new Set(['custom', 'ollama']);

async function callAI({ provider, apiKey, model, prompt, baseURL }) {
  if (!provider || !apiKey || !model || !prompt) {
    throw new Error('Missing required fields: provider, apiKey, model, prompt');
  }

  const normalized = provider.toLowerCase().trim();
  const slug = PROVIDER_SLUGS[normalized] || normalized;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (CUSTOM_HOST_PROVIDERS.has(slug)) {
    if (!baseURL) throw new Error(`Provider "${provider}" requires a base URL. Pass a baseURL parameter.`);
    headers['x-portkey-provider'] = 'openai';
    headers['x-portkey-custom-host'] = baseURL;
  } else {
    headers['x-portkey-provider'] = slug;
    if (baseURL) headers['x-portkey-custom-host'] = baseURL;
  }

  console.log(`[AI] Calling ${slug} via gateway with model: ${model}`);

  const controller = new AbortController();
  // 110s: slow providers (free-tier models especially) regularly take 60-100s on
  // large prompts; must stay under the 120s route timeout in app.js
  const timeout = setTimeout(() => controller.abort(), 110000);

  try {
    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No text content in AI response');

    console.log(`[AI] Response received from ${slug}`);
    return text;
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      throw new Error('AI gateway is not running. Restart the server to relaunch it.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { callAI };
