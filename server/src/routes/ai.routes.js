const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { aiLimiter } = require('../middleware/rateLimiter');

// POST /api/ai/query — customer or admin AI query
router.post('/query', aiLimiter, async (req, res, next) => {
  try {
    const { query, context = 'customer', userId } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new AppError('Query is required', 400);
    }

    // ── Find relevant documents via text search (vector search would use pgvector) ──
    const documents = await prisma.aiDocument.findMany({
      where: {
        OR: [
          { title: { contains: query.split(' ')[0], mode: 'insensitive' } },
          { content: { contains: query.split(' ')[0], mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, sourceType: true, sourceId: true, title: true, content: true },
    });

    // Build citations
    const citations = documents.map((doc) => ({
      sourceType: doc.sourceType,
      sourceId: doc.sourceId,
      title: doc.title,
      chunk: doc.content.substring(0, 200),
    }));

    // Placeholder response — in production, this would call OpenAI/Anthropic
    const response = documents.length
      ? `Based on our knowledge base, here's what I found related to your question:\n\n${documents.map((d) => `**${d.title}**: ${d.content.substring(0, 300)}...`).join('\n\n')}`
      : 'I\'m sorry, I couldn\'t find specific information about that. Please contact us directly for assistance.';

    // Safety flags placeholder
    const safetyFlags = {
      medical: /medical|health|allerg/i.test(query),
      allergen: /allergen|gluten|nut|dairy|egg|soy/i.test(query),
    };

    // Log query
    const aiQuery = await prisma.aiQuery.create({
      data: {
        userId: userId || null,
        query,
        response,
        citations,
        safetyFlags,
        context,
      },
    });

    res.json({
      success: true,
      data: {
        id: aiQuery.id,
        response,
        citations,
        safetyFlags,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/ingest — ingest document for AI knowledge base
router.post('/ingest', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { sourceType, sourceId, title, content, metadata } = req.body;

    if (!sourceType || !sourceId || !title || !content) {
      throw new AppError('sourceType, sourceId, title, and content are required', 400);
    }

    const validTypes = ['PRODUCT', 'KB_ARTICLE', 'POLICY', 'FAQ', 'SOP'];
    if (!validTypes.includes(sourceType)) {
      throw new AppError(`sourceType must be one of: ${validTypes.join(', ')}`, 400);
    }

    const document = await prisma.aiDocument.upsert({
      where: { sourceType_sourceId: { sourceType, sourceId } },
      update: { title, content, metadata: metadata || null },
      create: { sourceType, sourceId, title, content, metadata: metadata || null },
    });

    // In production: chunk text and generate embeddings via OpenAI
    // For now, create a single chunk for search
    await prisma.aiEmbedding.deleteMany({ where: { documentId: document.id } });
    await prisma.aiEmbedding.create({
      data: {
        documentId: document.id,
        chunkIndex: 0,
        chunkText: content.substring(0, 8000),
      },
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/documents — list AI documents (admin)
router.get('/documents', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { sourceType, page = 1, limit = 50 } = req.query;

    const where = {};
    if (sourceType) where.sourceType = sourceType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [documents, total] = await Promise.all([
      prisma.aiDocument.findMany({
        where,
        select: {
          id: true,
          sourceType: true,
          sourceId: true,
          title: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { embeddings: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.aiDocument.count({ where }),
    ]);

    res.json({
      success: true,
      data: documents,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
