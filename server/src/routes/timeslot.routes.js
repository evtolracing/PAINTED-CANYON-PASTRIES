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
      // Accept both lowercase and uppercase
      where.type = type.toUpperCase();
    }

    const timeslots = await prisma.timeslot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Add availability info
    const slotsWithAvailability = timeslots
      .filter((slot) => slot.currentCount < slot.maxCapacity)
      .map((slot) => ({
        ...slot,
        availableCapacity: slot.maxCapacity - slot.currentCount,
        spotsLeft: slot.maxCapacity - slot.currentCount,
        isFull: false,
      }));

    res.json({ success: true, data: slotsWithAvailability });
  } catch (error) {
    next(error);
  }
});

// GET /api/timeslots/available — alias for front-end compatibility
router.get('/available', async (req, res, next) => {
  try {
    const { type, date, days = 7 } = req.query;

    const where = { isBlocked: false };

    if (date) {
      where.date = new Date(date);
    } else {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + parseInt(days));
      where.date = { gte: start, lt: end };
    }

    if (type) {
      where.type = type.toUpperCase();
    }

    const timeslots = await prisma.timeslot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const available = timeslots
      .filter((slot) => slot.currentCount < slot.maxCapacity)
      .map((slot) => ({
        ...slot,
        date: slot.date.toISOString().slice(0, 10),
        availableCapacity: slot.maxCapacity - slot.currentCount,
        spotsLeft: slot.maxCapacity - slot.currentCount,
        isFull: false,
      }));

    res.json({ success: true, data: available });
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

// PUT /api/timeslots/store-hours — upsert store hours (admin)
router.put('/store-hours', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { hours } = req.body;
    if (!Array.isArray(hours) || hours.length === 0) {
      throw new AppError('hours array is required', 400);
    }

    const results = [];
    for (const h of hours) {
      if (h.dayOfWeek === undefined || h.dayOfWeek < 0 || h.dayOfWeek > 6) {
        throw new AppError('Each entry must have a valid dayOfWeek (0-6)', 400);
      }
      const record = await prisma.storeHours.upsert({
        where: { dayOfWeek: h.dayOfWeek },
        update: {
          openTime: h.openTime || '07:00',
          closeTime: h.closeTime || '18:00',
          isClosed: h.isClosed ?? false,
        },
        create: {
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime || '07:00',
          closeTime: h.closeTime || '18:00',
          isClosed: h.isClosed ?? false,
        },
      });
      results.push(record);
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// POST /api/timeslots/blackout-dates — create blackout date (admin)
router.post('/blackout-dates', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    if (!date) throw new AppError('date is required', 400);

    const blackout = await prisma.blackoutDate.create({
      data: {
        date: new Date(date),
        reason: reason || null,
      },
    });

    res.status(201).json({ success: true, data: blackout });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('A blackout date already exists for this date', 409));
    }
    next(error);
  }
});

// DELETE /api/timeslots/blackout-dates/:id — remove blackout date (admin)
router.delete('/blackout-dates/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.blackoutDate.findUnique({ where: { id } });
    if (!existing) throw new AppError('Blackout date not found', 404);

    await prisma.blackoutDate.delete({ where: { id } });
    res.json({ success: true, message: 'Blackout date removed' });
  } catch (error) {
    next(error);
  }
});

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
