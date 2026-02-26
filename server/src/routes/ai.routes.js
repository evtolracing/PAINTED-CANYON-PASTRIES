const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { aiLimiter } = require('../middleware/rateLimiter');
const { processQuery } = require('../ai/query');
const { generateImageWithGemini } = require('../ai/provider');
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

// GET /api/ai/queries — query history (admin)
router.get('/queries', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { limit = 20, page = 1, context } = req.query;

    const where = {};
    if (context) where.context = context;

    const take = parseInt(limit);
    const skip = (parseInt(page) - 1) * take;

    const [queries, total] = await Promise.all([
      prisma.aiQuery.findMany({
        where,
        select: {
          id: true,
          query: true,
          response: true,
          context: true,
          safetyFlags: true,
          feedbackRating: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.aiQuery.count({ where }),
    ]);

    res.json({
      success: true,
      data: queries,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
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

// POST /api/ai/generate-image — generate an image from a text prompt using Gemini
router.post('/generate-image', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new AppError('prompt is required', 400);
    }

    logger.info(`Generating image for prompt: "${prompt.trim().substring(0, 80)}..."`);

    // Generate image via Gemini
    let imageResult;
    try {
      imageResult = await generateImageWithGemini(prompt.trim());
    } catch (err) {
      throw new AppError(`Image generation failed: ${err.message}`, 502);
    }
    const { data: base64Data, mimeType } = imageResult;

    // Convert base64 to Buffer and upload to Supabase Storage
    const { uploadToStorage } = require('../config/storage');
    const ext = mimeType === 'image/jpeg' ? '.jpg' : '.png';
    const buffer = Buffer.from(base64Data, 'base64');
    const fakeFile = {
      originalname: `ai-generated${ext}`,
      buffer,
      mimetype: mimeType,
    };

    let url;
    try {
      url = await uploadToStorage(fakeFile, 'ai-generated');
    } catch (err) {
      throw new AppError(`Storage upload failed: ${err.message}`, 502);
    }
    logger.info(`AI image uploaded to: ${url}`);

    res.status(201).json({ success: true, data: { url, mimeType } });
  } catch (error) {
    logger.error(`Image generation failed: ${error.message}`);
    next(error);
  }
});

module.exports = router;
