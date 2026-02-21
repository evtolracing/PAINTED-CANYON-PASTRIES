const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// POST /api/newsletter — subscribe
router.post('/', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      throw new AppError('Valid email is required', 400);
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: email.toLowerCase() } });

    if (existing) {
      if (existing.isActive) {
        return res.json({ success: true, message: 'Already subscribed' });
      }
      // Re-activate
      await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: { isActive: true },
      });
      return res.json({ success: true, message: 'Subscription reactivated' });
    }

    await prisma.newsletterSubscriber.create({
      data: { email: email.toLowerCase() },
    });

    res.status(201).json({ success: true, message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    next(error);
  }
});

// POST /api/newsletter/unsubscribe
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) throw new AppError('Email is required', 400);

    const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { email: email.toLowerCase() } });
    if (!subscriber) {
      return res.json({ success: true, message: 'Email not found in subscribers' });
    }

    await prisma.newsletterSubscriber.update({
      where: { email: email.toLowerCase() },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Successfully unsubscribed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
