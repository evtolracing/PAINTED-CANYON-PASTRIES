const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// Helper: get or create customer record for the logged-in user
const getCustomer = async (user) => {
  let customer = await prisma.customer.findUnique({ where: { userId: user.id } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  }
  return customer;
};

// ─── ADDRESSES ────────────────────────────────────────────

// GET /api/customer/addresses
router.get('/addresses', authenticate, async (req, res, next) => {
  try {
    const customer = await getCustomer(req.user);
    const addresses = await prisma.address.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });

    // Map line1 → street for frontend compatibility
    const mapped = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      street: a.line1,
      city: a.city,
      state: a.state,
      zip: a.zip,
      isDefault: a.isDefault,
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
});

// POST /api/customer/addresses
router.post('/addresses', authenticate, async (req, res, next) => {
  try {
    const customer = await getCustomer(req.user);
    const { label, street, city, state, zip } = req.body;

    if (!street || !city || !state || !zip) {
      throw new AppError('Street, city, state, and zip are required', 400);
    }

    const address = await prisma.address.create({
      data: {
        customerId: customer.id,
        label: label || null,
        line1: street,
        city,
        state,
        zip,
      },
    });

    res.status(201).json({
      success: true,
      data: { id: address.id, label: address.label, street: address.line1, city: address.city, state: address.state, zip: address.zip, isDefault: address.isDefault },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/customer/addresses/:id
router.put('/addresses/:id', authenticate, async (req, res, next) => {
  try {
    const customer = await getCustomer(req.user);
    const { id } = req.params;
    const { label, street, city, state, zip } = req.body;

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: { id, customerId: customer.id },
    });
    if (!existing) throw new AppError('Address not found', 404);

    const address = await prisma.address.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(street !== undefined && { line1: street }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
      },
    });

    res.json({
      success: true,
      data: { id: address.id, label: address.label, street: address.line1, city: address.city, state: address.state, zip: address.zip, isDefault: address.isDefault },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customer/addresses/:id
router.delete('/addresses/:id', authenticate, async (req, res, next) => {
  try {
    const customer = await getCustomer(req.user);
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: { id, customerId: customer.id },
    });
    if (!existing) throw new AppError('Address not found', 404);

    await prisma.address.delete({ where: { id } });
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
