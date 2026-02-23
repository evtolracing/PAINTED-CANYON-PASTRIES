const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ─── ADMIN ────────────────────────────────────────────────

// POST /api/customers — create a new customer (admin)
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, notes, tags } = req.body;

    if (!firstName || !lastName || !email) {
      throw new AppError('firstName, lastName, and email are required', 400);
    }

    // Check for duplicate email
    const existing = await prisma.customer.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) throw new AppError('A customer with this email already exists', 409);

    const customer = await prisma.customer.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        tags: tags || [],
        isGuest: false,
      },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers — list all customers
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const {
      search, tag, isGuest,
      sortBy = 'createdAt', sortDir = 'desc',
      page = 1, limit = 25,
    } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (isGuest !== undefined) {
      where.isGuest = isGuest === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const allowedSort = ['createdAt', 'firstName', 'lastName', 'email', 'creditBalance'];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: { select: { orders: true } },
        },
        orderBy: { [orderField]: sortDir === 'asc' ? 'asc' : 'desc' },
        skip,
        take,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id — single customer with orders
router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            items: { include: { product: { select: { id: true, name: true } } } },
          },
        },
        promoRedemptions: {
          include: { promo: { select: { code: true, type: true, value: true } } },
        },
        _count: { select: { orders: true } },
      },
    });

    if (!customer) throw new AppError('Customer not found', 404);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// PUT /api/customers/:id — update customer
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, notes, tags } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Customer not found', 404);

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== existing.email) {
        const dup = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
        if (dup) throw new AppError('A customer with this email already exists', 409);
      }
      updateData.email = normalizedEmail;
    }
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (tags !== undefined) updateData.tags = tags;

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customers/:id — delete customer
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) throw new AppError('Customer not found', 404);

    if (existing._count.orders > 0) {
      throw new AppError(
        `Cannot delete customer with ${existing._count.orders} existing order(s). Remove or reassign orders first.`,
        400
      );
    }

    await prisma.customer.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'customer.deleted',
        entityType: 'customer',
        entityId: id,
        metadata: { email: existing.email, name: `${existing.firstName} ${existing.lastName}` },
      },
    });

    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /api/customers/:id/credit — add store credit
router.post('/:id/credit', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || typeof amount !== 'number') {
      throw new AppError('Valid amount is required', 400);
    }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Customer not found', 404);

    const newBalance = parseFloat(existing.creditBalance) + amount;
    if (newBalance < 0) throw new AppError('Credit balance cannot be negative', 400);

    const customer = await prisma.customer.update({
      where: { id },
      data: { creditBalance: newBalance },
    });

    // Audit trail
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'customer.credit_adjusted',
        entityType: 'customer',
        entityId: id,
        metadata: { amount, reason, newBalance },
      },
    });

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

// POST /api/customers/:id/tags — add a tag
router.post('/:id/tags', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;

    if (!tag || typeof tag !== 'string') {
      throw new AppError('Tag string is required', 400);
    }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Customer not found', 404);

    if (existing.tags.includes(tag)) {
      return res.json({ success: true, data: existing, message: 'Tag already exists' });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { tags: { push: tag } },
    });

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
