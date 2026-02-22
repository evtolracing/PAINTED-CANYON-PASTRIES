const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

// POST /api/contact — receive a contact form submission
router.post('/', async (req, res, next) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: { message: 'Name, email, and message are required' } });
    }

    // Log the contact message (in production, send an email or store in DB)
    logger.info('Contact form submission', { name, email, message: message.substring(0, 500) });

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We\'ll get back to you soon!',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
