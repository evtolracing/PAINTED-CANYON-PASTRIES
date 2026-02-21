const prisma = require('../config/database');
const { getProvider } = require('./provider');
const logger = require('../config/logger');

const SAFETY_PATTERNS = {
  medical: /\b(medical|diagnosis|diagnose|prescri(?:be|ption)|treat(?:ment)?|symptom|disease|health\s*condition|allerg(?:ic|y)\s*reaction|anaphyla)/i,
  harmful: /\b(weapon|hack|exploit|illegal|drug(?:s)?(?!\s*free))\b/i,
};

const SYSTEM_PROMPTS = {
  customer: `You are the Painted Canyon Pastries AI assistant — a friendly, knowledgeable helper for a premium artisan bakery in Joshua Tree, CA.

RULES:
- Only answer questions about our bakery, products, policies, ordering, delivery, and pickup.
- Always cite your sources using [Source: title] format.
- Be warm, helpful, and concise.
- For allergen questions, always err on the side of caution. Include "may contain traces" warnings when relevant.
- NEVER provide medical advice. If asked about allergies in a medical context, say: "I'd recommend consulting with a healthcare professional for medical advice about allergies."
- For order status inquiries, ask the customer to provide their order number and email to verify identity.
- You can recommend products based on preferences.
- You can help build carts for groups/events.
- If you don't know something, say so honestly.`,

  admin: `You are the Painted Canyon Pastries admin AI assistant — a smart operations helper for bakery staff.

CAPABILITIES:
- Analyze orders, customers, and production data.
- Suggest production batching and ingredient estimates.
- Draft customer communications in the bakery's brand voice (warm, professional, artisanal).
- Generate KB articles and SOP drafts.
- Generate product descriptions.
- Answer operational questions about inventory, scheduling, and fulfillment.

RULES:
- Be concise and action-oriented.
- Cite data sources when providing specific numbers.
- Provide practical, bakery-operations-focused advice.`,
};

const searchSimilarChunks = async (queryEmbedding, limit = 5, context = 'customer') => {
  try {
    // Use pgvector similarity search
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    let typeFilter = '';
    if (context === 'customer') {
      typeFilter = `AND d.source_type IN ('PRODUCT', 'KB_ARTICLE', 'FAQ', 'POLICY')`;
    }

    const results = await prisma.$queryRawUnsafe(`
      SELECT
        e.chunk_text,
        e.chunk_index,
        d.title,
        d.source_type,
        d.source_id,
        1 - (e.embedding <=> $1::vector) as similarity
      FROM ai_embeddings e
      JOIN ai_documents d ON e.document_id = d.id
      WHERE e.embedding IS NOT NULL ${typeFilter}
      ORDER BY e.embedding <=> $1::vector
      LIMIT $2
    `, embeddingStr, limit);

    return results;
  } catch (error) {
    logger.error(`Similarity search failed: ${error.message}`);
    return [];
  }
};

const checkSafety = (query) => {
  const flags = {};
  for (const [key, pattern] of Object.entries(SAFETY_PATTERNS)) {
    if (pattern.test(query)) {
      flags[key] = true;
    }
  }
  return flags;
};

const processQuery = async ({ query, context = 'customer', userId = null, conversationHistory = [] }) => {
  const provider = getProvider();
  const safetyFlags = checkSafety(query);

  // If medical query, return safety response
  if (safetyFlags.medical && context === 'customer') {
    const safeResponse = {
      response: "I appreciate your concern about allergies and dietary needs! While I can share what allergens are present in our products, I'd recommend consulting with a healthcare professional for medical advice about allergic reactions or conditions. I'm happy to help you find products that avoid specific allergens — just let me know what you'd like to avoid!",
      citations: [],
      safetyFlags,
    };

    await logQuery({ query, response: safeResponse.response, citations: [], safetyFlags, context, userId });
    return safeResponse;
  }

  // Generate embedding for query
  let relevantChunks = [];
  try {
    const queryEmbedding = await provider.embed(query);
    relevantChunks = await searchSimilarChunks(queryEmbedding, 5, context);
  } catch (error) {
    logger.warn(`Embedding search failed, proceeding without context: ${error.message}`);
  }

  // Build context from retrieved chunks
  const contextText = relevantChunks.length > 0
    ? relevantChunks.map((chunk, i) =>
      `[Source ${i + 1}: ${chunk.title} (${chunk.source_type})]:\n${chunk.chunk_text}`
    ).join('\n\n')
    : 'No specific information found in the knowledge base.';

  // Build messages
  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.customer },
    { role: 'system', content: `RELEVANT INFORMATION:\n${contextText}` },
    ...conversationHistory.slice(-6),
    { role: 'user', content: query },
  ];

  const result = await provider.chat(messages, {
    temperature: 0.7,
    maxTokens: 1024,
  });

  // Extract citations from context
  const citations = relevantChunks
    .filter(chunk => chunk.similarity > 0.7)
    .map(chunk => ({
      sourceType: chunk.source_type,
      sourceId: chunk.source_id,
      title: chunk.title,
      similarity: Number(chunk.similarity).toFixed(3),
    }));

  const response = {
    response: result.content,
    citations,
    safetyFlags,
  };

  await logQuery({
    query,
    response: result.content,
    citations,
    safetyFlags,
    context,
    userId,
  });

  return response;
};

const logQuery = async ({ query, response, citations, safetyFlags, context, userId }) => {
  try {
    await prisma.aiQuery.create({
      data: {
        userId,
        query,
        response,
        citations,
        safetyFlags,
        context,
      },
    });
  } catch (error) {
    logger.error(`Failed to log AI query: ${error.message}`);
  }
};

module.exports = {
  processQuery,
  searchSimilarChunks,
  checkSafety,
  SYSTEM_PROMPTS,
};
