const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ─── PUBLIC ───────────────────────────────────────────────

// POST /api/promos/validate — validate a promo code
router.post('/validate', async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;

    if (!code) throw new AppError('Promo code is required', 400);

    const promo = await prisma.promo.findUnique({ where: { code: code.toUpperCase() } });

    if (!promo || !promo.isActive) {
      throw new AppError('Invalid promo code', 400);
    }

    const now = new Date();
    if (promo.startsAt && now < promo.startsAt) throw new AppError('Promo is not yet active', 400);
    if (promo.expiresAt && now > promo.expiresAt) throw new AppError('Promo has expired', 400);
    if (promo.maxUses && promo.usedCount >= promo.maxUses) throw new AppError('Promo usage limit reached', 400);
    if (promo.minOrderAmount && subtotal && subtotal < parseFloat(promo.minOrderAmount)) {
      throw new AppError(`Minimum order of $${promo.minOrderAmount} required for this promo`, 400);
    }

    let discount = 0;
    if (subtotal) {
      if (promo.type === 'PERCENTAGE') {
        discount = parseFloat(subtotal) * parseFloat(promo.value) / 100;
      } else if (promo.type === 'FIXED_AMOUNT') {
        discount = Math.min(parseFloat(promo.value), parseFloat(subtotal));
      }
    }

    res.json({
      success: true,
      data: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        description: promo.description,
        discount: Math.round(discount * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN CRUD ───────────────────────────────────────────

// GET /api/promos
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { active, page = 1, limit = 50 } = req.query;

    const where = {};
    if (active !== undefined) where.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [promos, total] = await Promise.all([
      prisma.promo.findMany({
        where,
        include: { _count: { select: { redemptions: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.promo.count({ where }),
    ]);

    res.json({
      success: true,
      data: promos,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/promos/:id
router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const promo = await prisma.promo.findUnique({
      where: { id: req.params.id },
      include: {
        redemptions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, email: true } },
            order: { select: { id: true, orderNumber: true, totalAmount: true } },
          },
        },
        _count: { select: { redemptions: true } },
      },
    });

    if (!promo) throw new AppError('Promo not found', 404);
    res.json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
});

// POST /api/promos
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const {
      code, type, value, minOrderAmount, maxUses, maxUsesPerUser,
      isActive, startsAt, expiresAt, description,
    } = req.body;

    if (!code || !type || value === undefined) {
      throw new AppError('code, type, and value are required', 400);
    }

    const promo = await prisma.promo.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        minOrderAmount: minOrderAmount || null,
        maxUses: maxUses || null,
        maxUsesPerUser: maxUsesPerUser || 1,
        isActive: isActive !== false,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        description: description || null,
      },
    });

    res.status(201).json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
});

// PUT /api/promos/:id
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.promo.findUnique({ where: { id } });
    if (!existing) throw new AppError('Promo not found', 404);

    const {
      code, type, value, minOrderAmount, maxUses, maxUsesPerUser,
      isActive, startsAt, expiresAt, description,
    } = req.body;

    const updateData = {};
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (type !== undefined) updateData.type = type;
    if (value !== undefined) updateData.value = value;
    if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount;
    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (maxUsesPerUser !== undefined) updateData.maxUsesPerUser = maxUsesPerUser;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (description !== undefined) updateData.description = description;

    const promo = await prisma.promo.update({ where: { id }, data: updateData });
    res.json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/promos/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.promo.findUnique({ where: { id } });
    if (!existing) throw new AppError('Promo not found', 404);

    await prisma.promo.delete({ where: { id } });
    res.json({ success: true, message: 'Promo deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
