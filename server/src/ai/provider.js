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

const getProvider = (providerName) => {
  const name = providerName || process.env.AI_PROVIDER || 'openai';
  switch (name.toLowerCase()) {
    case 'deepseek':
      return new DeepSeekProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'openai':
    default:
      return new OpenAIProvider();
  }
};

module.exports = { AIProvider, OpenAIProvider, AnthropicProvider, DeepSeekProvider, getProvider };
