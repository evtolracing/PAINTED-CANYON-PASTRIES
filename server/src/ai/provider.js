/**
 * AI Provider Adapter Interface
 * Supports OpenAI and Anthropic with a clean pluggable interface
 */

class AIProvider {
  constructor(config = {}) {
    this.config = config;
  }
  async chat(messages, options = {}) { throw new Error('Not implemented'); }
  async embed(text) { throw new Error('Not implemented'); }
}

class OpenAIProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!this.apiKey) throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY environment variable.');
    this.chatModel = config.chatModel || process.env.AI_CHAT_MODEL || 'gpt-4o-mini';
    this.embeddingModel = config.embeddingModel || process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  async chat(messages, options = {}) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.chatModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  }

  async embed(text) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI Embedding error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  }
}

class DeepSeekProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY;
    if (!this.apiKey) throw new Error('DeepSeek API key is not configured. Set DEEPSEEK_API_KEY environment variable.');
    this.chatModel = config.chatModel || process.env.AI_CHAT_MODEL || 'deepseek-chat';
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com';
  }

  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.chatModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  }

  async embed(text) {
    // DeepSeek doesn't offer an embedding API — fall back to OpenAI if key is available
    if (process.env.OPENAI_API_KEY) {
      const fallback = new OpenAIProvider();
      return fallback.embed(text);
    }
    throw new Error('Embedding not supported by DeepSeek and no OPENAI_API_KEY configured for fallback');
  }
}

class AnthropicProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!this.apiKey) throw new Error('Anthropic API key is not configured. Set ANTHROPIC_API_KEY environment variable.');
    this.chatModel = config.chatModel || 'claude-sonnet-4-20250514';
    // Anthropic doesn't have embeddings - fall back to OpenAI for embeddings
    this.embeddingProvider = process.env.OPENAI_API_KEY ? new OpenAIProvider(config) : null;
  }

  async chat(messages, options = {}) {
    // Convert from OpenAI format to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || this.chatModel,
        system: systemMessage,
        messages: conversationMessages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      usage: data.usage,
    };
  }

  async embed(text) {
    if (!this.embeddingProvider) throw new Error('Embedding not supported by Anthropic and no OPENAI_API_KEY configured for fallback');
    return this.embeddingProvider.embed(text);
  }
}

class GeminiProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!this.apiKey) throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY environment variable.');
    this.chatModel = config.chatModel || process.env.AI_CHAT_MODEL || 'gemini-1.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async chat(messages, options = {}) {
    const systemMsg = messages.find(m => m.role === 'system');
    const convMessages = messages.filter(m => m.role !== 'system');

    const contents = convMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens || 1024,
      },
    };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const response = await fetch(
      `${this.baseUrl}/models/${options.model || this.chatModel}:generateContent?key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      usage: data.usageMetadata,
    };
  }

  async embed(text) {
    // Fall back to OpenAI for embeddings (pgvector dimension compatibility)
    if (process.env.OPENAI_API_KEY) {
      const fallback = new OpenAIProvider();
      return fallback.embed(text);
    }
    throw new Error('No OPENAI_API_KEY configured for embeddings (Gemini embeddings use different dimensions)');
  }
}

/**
 * Generate an image using Gemini 2.5 Flash image generation.
 * Returns { data: base64String, mimeType: 'image/png' }
 */
async function generateImageWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = 'gemini-2.5-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini image generation error: ${err.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const parts = result.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);
  if (!imagePart) throw new Error('No image returned by Gemini. The prompt may have been blocked.');

  return {
    data: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

/**
 * Generate an AI background for a product image using Gemini.
 * Sends the original image + a text prompt asking Gemini to replace/enhance the background.
 * Returns { data: base64String, mimeType: 'image/png' }
 */
async function generateBackgroundWithGemini(imageBase64, imageMimeType, productName) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = 'gemini-2.5-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are a professional food photographer and photo editor for a premium artisan bakery called "Painted Canyon Pastries".

Take this product image and create a beautiful, professional version with an enhanced background. Rules:
1. Keep the product/food item EXACTLY as it appears — do NOT alter the product itself
2. Replace or enhance the background with a warm, inviting bakery-themed setting
3. Use soft, warm lighting that makes the product look appetizing
4. Background ideas: rustic wooden surface, marble countertop, parchment paper, flour-dusted surface, elegant bakery display, warm kitchen setting
5. The result should look like a professional product photo for an upscale bakery website
6. Make sure the product is the clear focal point
${productName ? `7. This product is: ${productName}` : ''}

Return ONLY the edited image with the enhanced background.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: imageMimeType,
              data: imageBase64,
            },
          },
        ],
      }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini background generation error: ${err.error?.message || response.statusText}`);
  }

  const result = await response.json();
  const parts = result.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);
  if (!imagePart) throw new Error('No image returned by Gemini. The prompt may have been blocked or the image could not be processed.');

  return {
    data: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

const getProvider = (providerName) => {
  const name = providerName || process.env.AI_PROVIDER || 'openai';
  switch (name.toLowerCase()) {
    case 'deepseek':
      return new DeepSeekProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'openai':
    default:
      return new OpenAIProvider();
  }
};

module.exports = { AIProvider, OpenAIProvider, AnthropicProvider, DeepSeekProvider, GeminiProvider, getProvider, generateImageWithGemini, generateBackgroundWithGemini };
