const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// GET /api/settings — get all settings (or specific key)
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { key } = req.query;

    if (key) {
      const setting = await prisma.setting.findUnique({ where: { key } });
      if (!setting) throw new AppError(`Setting "${key}" not found`, 404);
      return res.json({ success: true, data: setting });
    }

    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });

    // Transform to key-value map for convenience
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    res.json({ success: true, data: settingsMap, raw: settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings — upsert settings (accepts object of key-value pairs)
router.put('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new AppError('Request body must be an object of key-value pairs', 400);
    }

    const upserted = [];
    for (const [key, value] of Object.entries(settings)) {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      upserted.push(setting);
    }

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'settings.updated',
        entityType: 'settings',
        metadata: { keys: Object.keys(settings) },
      },
    });

    res.json({ success: true, data: upserted });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/:key — upsert a single setting
router.put('/:key', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) throw new AppError('value is required', 400);

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    res.json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
