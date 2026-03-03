const prisma = require('../config/database');
const { getProvider } = require('./provider');
const logger = require('../config/logger');

// ── Fetch live product catalog from DB ──
const getProductCatalog = async () => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        allergenTags: { include: { allergen: true } },
        addons: { where: { isActive: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (products.length === 0) return 'No products currently in our catalog.';

    return products.map(p => {
      const lines = [`${p.name} (${p.category?.name || 'Uncategorized'})`];
      lines.push(`  Price: $${Number(p.basePrice).toFixed(2)}`);
      if (p.compareAtPrice) lines.push(`  Compare at: $${Number(p.compareAtPrice).toFixed(2)}`);
      if (p.shortDescription) lines.push(`  ${p.shortDescription}`);
      if (p.description) lines.push(`  Details: ${p.description.replace(/<[^>]*>/g, '').substring(0, 300)}`);
      if (p.badges?.length) lines.push(`  Badges: ${p.badges.join(', ')}`);
      if (p.nutritionNotes) lines.push(`  Nutrition: ${p.nutritionNotes}`);
      if (p.prepTimeMinutes) lines.push(`  Prep time: ${p.prepTimeMinutes} minutes`);

      // Variants (sizes, flavors, packs)
      if (p.variants.length > 0) {
        const varsByType = {};
        p.variants.forEach(v => {
          if (!varsByType[v.type]) varsByType[v.type] = [];
          varsByType[v.type].push(`${v.name}: $${Number(v.price).toFixed(2)}`);
        });
        for (const [type, items] of Object.entries(varsByType)) {
          lines.push(`  ${type.charAt(0).toUpperCase() + type.slice(1)} options: ${items.join(', ')}`);
        }
      }

      // Allergens
      if (p.allergenTags.length > 0) {
        const allergens = p.allergenTags.map(at =>
          `${at.allergen.name} (${at.severity === 'contains' ? 'contains' : at.severity === 'may_contain' ? 'may contain' : 'same facility'})`
        );
        lines.push(`  Allergens: ${allergens.join(', ')}`);
      }

      // Add-ons
      if (p.addons.length > 0) {
        lines.push(`  Add-ons: ${p.addons.map(a => `${a.name} (+$${Number(a.price).toFixed(2)})`).join(', ')}`);
      }

      if (p.seasonalStart || p.seasonalEnd) {
        const start = p.seasonalStart ? new Date(p.seasonalStart).toLocaleDateString() : '';
        const end = p.seasonalEnd ? new Date(p.seasonalEnd).toLocaleDateString() : '';
        lines.push(`  Seasonal availability: ${start}${start && end ? ' – ' : ''}${end}`);
      }

      return lines.join('\n');
    }).join('\n\n');
  } catch (error) {
    logger.error(`Failed to fetch product catalog: ${error.message}`);
    return 'Product catalog unavailable.';
  }
};

const SAFETY_PATTERNS = {
  medical: /\b(medical|diagnosis|diagnose|prescri(?:be|ption)|treat(?:ment)?|symptom|disease|health\s*condition|allerg(?:ic|y)\s*reaction|anaphyla)/i,
  harmful: /\b(weapon|hack|exploit|illegal|drug(?:s)?(?!\s*free))\b/i,
};

const SYSTEM_PROMPTS = {
  customer: `You are the Painted Canyon Pastries AI assistant — a friendly, knowledgeable helper for a premium artisan bakery in Joshua Tree, CA.

RULES:
- Only answer questions about our bakery, products, policies, ordering, delivery, and pickup.
- You have full access to our live product catalog with names, prices, descriptions, variants, allergens, nutrition info, and more. Use it to give accurate, specific answers.
- When asked about pricing, always quote the exact price from the catalog.
- When asked about allergens or dietary needs, reference the allergen data from the catalog. If a product has no allergen tags listed, say you don't have allergen info for that specific item and suggest contacting the bakery.
- When asked about nutrition, share the nutritionNotes if available. If not, say we don't have detailed nutrition info for that item yet.
- You can recommend products based on preferences, dietary needs, or occasions.
- You can compare products and suggest pairings.
- Always cite your sources using [Source: title] format when using KB articles.
- Be warm, helpful, and concise.
- For allergen questions, always err on the side of caution. Include "may contain traces" warnings when relevant.
- NEVER provide medical advice. If asked about allergies in a medical context, say: "I'd recommend consulting with a healthcare professional for medical advice about allergies."
- For order status inquiries, ask the customer to provide their order number and email to verify identity.
- If you don't know something, say so honestly.

FORMATTING:
- NEVER use markdown formatting in your responses. No asterisks, no hashtags, no bold, no italics, no bullet points with dashes.
- Write in plain, natural sentences and short paragraphs.
- Use line breaks to separate ideas, not bullet lists.
- Keep responses conversational and easy to read as plain text.`,

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
- Provide practical, bakery-operations-focused advice.

FORMATTING:
- NEVER use markdown formatting in your responses. No asterisks, no hashtags, no bold, no italics, no bullet points with dashes.
- Write in plain, natural sentences and short paragraphs.
- Use line breaks to separate ideas, not bullet lists.
- When listing items, use simple numbered lists or commas instead of markdown bullets.`,
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

  // Generate embedding for query or fall back to text search
  let relevantChunks = [];
  try {
    const queryEmbedding = await provider.embed(query);
    relevantChunks = await searchSimilarChunks(queryEmbedding, 5, context);
  } catch (error) {
    logger.warn(`Embedding search failed, falling back to text search: ${error.message}`);
    // Fallback: text-based search using Prisma
    try {
      const typeFilter = context === 'customer'
        ? { sourceType: { in: ['PRODUCT', 'KB_ARTICLE', 'FAQ', 'POLICY'] } }
        : {};
      const keywords = query.split(/\s+/).filter(w => w.length > 2).slice(0, 3);
      if (keywords.length > 0) {
        const docs = await prisma.aiDocument.findMany({
          where: {
            ...typeFilter,
            OR: keywords.flatMap(kw => [
              { title: { contains: kw, mode: 'insensitive' } },
              { content: { contains: kw, mode: 'insensitive' } },
            ]),
          },
          take: 5,
          select: { title: true, sourceType: true, sourceId: true, content: true },
        });
        relevantChunks = docs.map(d => ({
          title: d.title,
          source_type: d.sourceType,
          source_id: d.sourceId,
          chunk_text: d.content.substring(0, 500),
          similarity: 0.8,
        }));
      }
    } catch (searchError) {
      logger.warn(`Text search fallback also failed: ${searchError.message}`);
    }
  }

  // Build context from retrieved chunks
  const contextText = relevantChunks.length > 0
    ? relevantChunks.map((chunk, i) =>
      `[Source ${i + 1}: ${chunk.title} (${chunk.source_type})]:\n${chunk.chunk_text}`
    ).join('\n\n')
    : 'No specific information found in the knowledge base.';

  // Fetch live product catalog for customer queries
  let productCatalogText = '';
  if (context === 'customer') {
    productCatalogText = await getProductCatalog();
  }

  // Build messages
  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.customer },
    ...(productCatalogText ? [{ role: 'system', content: `PRODUCT CATALOG (live from our database):\n${productCatalogText}` }] : []),
    { role: 'system', content: `ADDITIONAL KNOWLEDGE BASE INFO:\n${contextText}` },
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
