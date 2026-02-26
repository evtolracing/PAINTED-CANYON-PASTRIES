const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const { categorySchema, updateCategorySchema } = require('../validators/product.validator');

// ─── PUBLIC ───────────────────────────────────────────────

// GET /api/categories — all active categories
router.get('/', async (req, res, next) => {
  try {
    const { includeProducts } = req.query;

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: includeProducts === 'true'
        ? { products: { where: { isActive: true }, select: { id: true, name: true, slug: true, basePrice: true } } }
        : undefined,
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// GET /api/categories/:idOrSlug
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(idOrSlug);

    const category = await prisma.category.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
      },
    });

    if (!category) throw new AppError('Category not found', 404);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ────────────────────────────────────────────────

// POST /api/categories
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), validate(categorySchema), async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    const category = await prisma.category.create({ data });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), validate(updateCategorySchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError('Category not found', 404);

    const category = await prisma.category.update({ where: { id }, data: req.body });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new AppError(`Cannot delete category with ${productCount} products. Reassign products first.`, 400);
    }

    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
