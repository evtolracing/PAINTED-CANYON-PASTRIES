const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const { productSchema, updateProductSchema } = require('../validators/product.validator');

// ─── PUBLIC ───────────────────────────────────────────────

// GET /api/products — list with filters, search, category, pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      category, search, featured, badge, active,
      minPrice, maxPrice,
      sortBy = 'sortOrder', sortDir = 'asc',
      page = 1, limit = 24,
    } = req.query;

    const where = {};

    // Default: only active products for public users
    if (!req.user || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user.role)) {
      where.isActive = true;
    } else if (active !== undefined) {
      where.isActive = active === 'true';
    }

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (badge) {
      where.badges = { has: badge };
    }

    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = parseFloat(minPrice);
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const allowedSort = ['sortOrder', 'name', 'basePrice', 'createdAt'];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'sortOrder';
    const orderDir = sortDir === 'desc' ? 'desc' : 'asc';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 },
          variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          allergenTags: { include: { allergen: true } },
        },
        orderBy: { [orderField]: orderDir },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:idOrSlug — single product with full details
router.get('/:idOrSlug', optionalAuth, async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const product = await prisma.product.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        category: true,
        variants: { orderBy: { sortOrder: 'asc' } },
        addons: { orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        allergenTags: { include: { allergen: true } },
        pairsWithFrom: {
          include: {
            toProduct: {
              select: { id: true, name: true, slug: true, basePrice: true, images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Non-admin users can only see active products
    if (!product.isActive && (!req.user || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user.role))) {
      throw new AppError('Product not found', 404);
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ────────────────────────────────────────────────

// POST /api/products — create product
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), validate(productSchema), async (req, res, next) => {
  try {
    const { allergenIds, variants, addons, ...productData } = req.body;

    // Auto-generate slug if not provided
    if (!productData.slug) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    const product = await prisma.product.create({
      data: {
        ...productData,
        ...(allergenIds?.length && {
          allergenTags: {
            create: allergenIds.map((a) => ({
              allergenId: a.allergenId,
              severity: a.severity || 'contains',
            })),
          },
        }),
        ...(variants?.length && {
          variants: { create: variants },
        }),
        ...(addons?.length && {
          addons: { create: addons },
        }),
      },
      include: {
        category: true,
        variants: true,
        addons: true,
        allergenTags: { include: { allergen: true } },
        images: true,
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id — update product
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), validate(updateProductSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allergenIds, variants, addons, ...productData } = req.body;

    // Verify exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError('Product not found', 404);

    const product = await prisma.$transaction(async (tx) => {
      // Update allergens if provided
      if (allergenIds) {
        await tx.productAllergenTag.deleteMany({ where: { productId: id } });
        if (allergenIds.length) {
          await tx.productAllergenTag.createMany({
            data: allergenIds.map((a) => ({
              productId: id,
              allergenId: a.allergenId,
              severity: a.severity || 'contains',
            })),
          });
        }
      }

      // Update variants if provided
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length) {
          await tx.productVariant.createMany({
            data: variants.map((v) => ({ ...v, productId: id })),
          });
        }
      }

      // Update addons if provided
      if (addons) {
        await tx.productAddon.deleteMany({ where: { productId: id } });
        if (addons.length) {
          await tx.productAddon.createMany({
            data: addons.map((a) => ({ ...a, productId: id })),
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: productData,
        include: {
          category: true,
          variants: true,
          addons: true,
          allergenTags: { include: { allergen: true } },
          images: true,
        },
      });
    });

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id — soft-delete (deactivate) or hard-delete
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError('Product not found', 404);

    if (hard === 'true') {
      await prisma.product.delete({ where: { id } });
      res.json({ success: true, message: 'Product permanently deleted' });
    } else {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      res.json({ success: true, message: 'Product deactivated' });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
