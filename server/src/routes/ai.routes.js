const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { aiLimiter } = require('../middleware/rateLimiter');
const { processQuery } = require('../ai/query');
const logger = require('../config/logger');

// POST /api/ai/query — customer or admin AI query
router.post('/query', aiLimiter, async (req, res, next) => {
  try {
    const { query, context = 'customer', userId, conversationHistory = [] } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new AppError('Query is required', 400);
    }

    const result = await processQuery({
      query: query.trim(),
      context,
      userId: userId || null,
      conversationHistory,
    });

    res.json({
      success: true,
      data: {
        response: result.response,
        citations: result.citations,
        safetyFlags: result.safetyFlags,
      },
    });
  } catch (error) {
    logger.error(`AI query failed: ${error.message}`);
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

    const { upsertDocument } = require('../ai/ingestion');
    const document = await upsertDocument({ sourceType, sourceId, title, content, metadata });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/ingest/products — bulk ingest all products
router.post('/ingest/products', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { ingestAllProducts } = require('../ai/ingestion');
    const count = await ingestAllProducts();
    res.json({ success: true, data: { count }, message: `Ingested ${count} products` });
  } catch (error) {
    logger.error(`Product ingestion failed: ${error.message}`);
    next(error);
  }
});

// POST /api/ai/ingest/kb — bulk ingest all KB articles
router.post('/ingest/kb', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { ingestAllArticles } = require('../ai/ingestion');
    const count = await ingestAllArticles();
    res.json({ success: true, data: { count }, message: `Ingested ${count} articles` });
  } catch (error) {
    logger.error(`KB ingestion failed: ${error.message}`);
    next(error);
  }
});

// POST /api/ai/ingest/all — bulk ingest everything
router.post('/ingest/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { ingestAll } = require('../ai/ingestion');
    const result = await ingestAll();
    res.json({ success: true, data: result, message: `Ingested ${result.products} products and ${result.articles} articles` });
  } catch (error) {
    logger.error(`Full ingestion failed: ${error.message}`);
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
