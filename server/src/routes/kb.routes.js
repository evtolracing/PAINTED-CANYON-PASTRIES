const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ─── PUBLIC ───────────────────────────────────────────────

// GET /api/kb — published articles (public)
router.get('/', async (req, res, next) => {
  try {
    const { category, search, faq, page = 1, limit = 20 } = req.query;

    const where = { isPublished: true, isInternal: false };

    if (category) {
      where.category = { slug: category };
    }

    if (faq === 'true') {
      where.isFaq = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [articles, total] = await Promise.all([
      prisma.kbArticle.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          isFaq: true,
          sortOrder: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { sortOrder: 'asc' },
        skip,
        take,
      }),
      prisma.kbArticle.count({ where }),
    ]);

    res.json({
      success: true,
      data: articles,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/kb/categories — public KB categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.kbCategory.findMany({
      where: { isPublic: true },
      include: { _count: { select: { articles: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// GET /api/kb/:idOrSlug — single article (public, increments view count)
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    // Avoid matching "categories" route
    if (idOrSlug === 'categories') return next();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(idOrSlug);

    const article = await prisma.kbArticle.findFirst({
      where: isUuid
        ? { id: idOrSlug, isPublished: true, isInternal: false }
        : { slug: idOrSlug, isPublished: true, isInternal: false },
      include: { category: true },
    });

    if (!article) throw new AppError('Article not found', 404);

    // Increment view count
    await prisma.kbArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ success: true, data: article });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ────────────────────────────────────────────────

// GET /api/kb/admin/articles — all articles (including drafts/internal)
router.get('/admin/articles', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { published, internal, category, page = 1, limit = 50 } = req.query;

    const where = {};
    if (published !== undefined) where.isPublished = published === 'true';
    if (internal !== undefined) where.isInternal = internal === 'true';
    if (category) where.category = { slug: category };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [articles, total] = await Promise.all([
      prisma.kbArticle.findMany({
        where,
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.kbArticle.count({ where }),
    ]);

    res.json({
      success: true,
      data: articles,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/kb/admin/articles
router.post('/admin/articles', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { categoryId, title, content, excerpt, isPublished, isInternal, isFaq, sortOrder } = req.body;

    if (!categoryId || !title || !content) {
      throw new AppError('categoryId, title, and content are required', 400);
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const article = await prisma.kbArticle.create({
      data: {
        categoryId,
        title,
        slug,
        content,
        excerpt: excerpt || null,
        isPublished: isPublished || false,
        isInternal: isInternal || false,
        isFaq: isFaq || false,
        sortOrder: sortOrder || 0,
      },
      include: { category: true },
    });

    res.status(201).json({ success: true, data: article });
  } catch (error) {
    next(error);
  }
});

// PUT /api/kb/admin/articles/:id
router.put('/admin/articles/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.kbArticle.findUnique({ where: { id } });
    if (!existing) throw new AppError('Article not found', 404);

    const { categoryId, title, content, excerpt, isPublished, isInternal, isFaq, sortOrder } = req.body;

    const updateData = {};
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (isInternal !== undefined) updateData.isInternal = isInternal;
    if (isFaq !== undefined) updateData.isFaq = isFaq;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const article = await prisma.kbArticle.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    res.json({ success: true, data: article });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/kb/admin/articles/:id
router.delete('/admin/articles/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.kbArticle.findUnique({ where: { id } });
    if (!existing) throw new AppError('Article not found', 404);

    await prisma.kbArticle.delete({ where: { id } });
    res.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN: KB CATEGORY MANAGEMENT ─────────────────────────

// POST /api/kb/categories — create a new KB category
router.post('/categories', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { name, slug, isPublic, sortOrder } = req.body;
    if (!name) throw new AppError('Category name is required', 400);

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const category = await prisma.kbCategory.create({
      data: {
        name,
        slug: finalSlug,
        isPublic: isPublic !== undefined ? isPublic : true,
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// PUT /api/kb/categories/:id — update a KB category
router.put('/categories/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, isPublic, sortOrder } = req.body;

    const existing = await prisma.kbCategory.findUnique({ where: { id } });
    if (!existing) throw new AppError('Category not found', 404);

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const category = await prisma.kbCategory.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
