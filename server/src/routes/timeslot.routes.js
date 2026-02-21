const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ─── PUBLIC ───────────────────────────────────────────────

// GET /api/timeslots — available timeslots for a date/type
router.get('/', async (req, res, next) => {
  try {
    const { date, type, days = 7 } = req.query;

    const where = { isBlocked: false };

    if (date) {
      where.date = new Date(date);
    } else {
      // Default: next N days
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + parseInt(days));
      where.date = { gte: start, lt: end };
    }

    if (type) {
      where.type = type;
    }

    const timeslots = await prisma.timeslot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Add availability info
    const slotsWithAvailability = timeslots.map((slot) => ({
      ...slot,
      availableCapacity: slot.maxCapacity - slot.currentCount,
      isFull: slot.currentCount >= slot.maxCapacity,
    }));

    res.json({ success: true, data: slotsWithAvailability });
  } catch (error) {
    next(error);
  }
});

// GET /api/timeslots/store-hours
router.get('/store-hours', async (req, res, next) => {
  try {
    const hours = await prisma.storeHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
    res.json({ success: true, data: hours });
  } catch (error) {
    next(error);
  }
});

// GET /api/timeslots/blackout-dates
router.get('/blackout-dates', async (req, res, next) => {
  try {
    const dates = await prisma.blackoutDate.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: dates });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ────────────────────────────────────────────────

// POST /api/timeslots — create single timeslot
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { date, startTime, endTime, type, maxCapacity, isBlocked } = req.body;

    if (!date || !startTime || !endTime || !type) {
      throw new AppError('date, startTime, endTime, and type are required', 400);
    }

    const timeslot = await prisma.timeslot.create({
      data: {
        date: new Date(date),
        startTime,
        endTime,
        type,
        maxCapacity: maxCapacity || 25,
        isBlocked: isBlocked || false,
      },
    });

    res.status(201).json({ success: true, data: timeslot });
  } catch (error) {
    next(error);
  }
});

// POST /api/timeslots/generate — bulk generate timeslots for date range
router.post('/generate', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { startDate, endDate, type, slots, maxCapacity = 25 } = req.body;

    if (!startDate || !endDate || !type || !slots?.length) {
      throw new AppError('startDate, endDate, type, and slots are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const created = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();

      // Check store hours for this day
      const hours = await prisma.storeHours.findUnique({ where: { dayOfWeek } });
      if (hours?.isClosed) continue;

      // Check blackout dates
      const blackout = await prisma.blackoutDate.findUnique({
        where: { date: new Date(d.toISOString().slice(0, 10)) },
      });
      if (blackout) continue;

      for (const slot of slots) {
        try {
          const ts = await prisma.timeslot.create({
            data: {
              date: new Date(d.toISOString().slice(0, 10)),
              startTime: slot.startTime,
              endTime: slot.endTime,
              type,
              maxCapacity,
            },
          });
          created.push(ts);
        } catch (e) {
          // Skip duplicates (unique constraint)
          if (e.code !== 'P2002') throw e;
        }
      }
    }

    res.status(201).json({ success: true, data: created, meta: { count: created.length } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/timeslots/:id
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { maxCapacity, isBlocked } = req.body;

    const existing = await prisma.timeslot.findUnique({ where: { id } });
    if (!existing) throw new AppError('Timeslot not found', 404);

    const updateData = {};
    if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

    const timeslot = await prisma.timeslot.update({ where: { id }, data: updateData });
    res.json({ success: true, data: timeslot });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/timeslots/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.timeslot.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) throw new AppError('Timeslot not found', 404);

    if (existing._count.orders > 0) {
      throw new AppError('Cannot delete timeslot with existing orders. Block it instead.', 400);
    }

    await prisma.timeslot.delete({ where: { id } });
    res.json({ success: true, message: 'Timeslot deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
