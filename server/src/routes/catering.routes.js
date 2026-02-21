const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ─── PUBLIC ───────────────────────────────────────────────

// POST /api/catering — submit a catering lead
router.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, eventDate, guestCount, details, budget } = req.body;

    if (!firstName || !lastName || !email) {
      throw new AppError('firstName, lastName, and email are required', 400);
    }

    const lead = await prisma.cateringLead.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        guestCount: guestCount ? parseInt(guestCount) : null,
        details: details || null,
        budget: budget || null,
        status: 'NEW',
      },
    });

    res.status(201).json({ success: true, data: lead, message: 'Catering inquiry submitted successfully' });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ────────────────────────────────────────────────

// GET /api/catering — list all leads
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 25 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [leads, total] = await Promise.all([
      prisma.cateringLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.cateringLead.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/catering/:id
router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const lead = await prisma.cateringLead.findUnique({ where: { id: req.params.id } });
    if (!lead) throw new AppError('Catering lead not found', 404);
    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/catering/:id — update lead status/notes
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const existing = await prisma.cateringLead.findUnique({ where: { id } });
    if (!existing) throw new AppError('Catering lead not found', 404);

    const updateData = {};
    if (status) {
      const validStatuses = ['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
      }
      updateData.status = status;
    }
    if (notes !== undefined) updateData.notes = notes;

    const lead = await prisma.cateringLead.update({ where: { id }, data: updateData });
    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
