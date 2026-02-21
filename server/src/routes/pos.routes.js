const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const stripe = require('../config/stripe');
const { authenticatePin } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// POST /api/pos/pin-login — authenticate POS staff via PIN
router.post('/pin-login', async (req, res, next) => {
  try {
    const { pin } = req.body;

    if (!pin) throw new AppError('PIN is required', 400);

    const user = await prisma.user.findFirst({
      where: {
        pin,
        isActive: true,
        role: { in: ['CASHIER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, avatar: true },
    });

    if (!user) throw new AppError('Invalid PIN', 401);

    // Generate a short-lived token for POS session
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, role: user.role, isPOS: true },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/pos/orders — create a POS order (walk-in or phone)
router.post('/orders', authenticatePin, async (req, res, next) => {
  try {
    const {
      items, fulfillmentType = 'WALKIN',
      paymentMethod = 'CASH', tipAmount = 0,
      customerEmail, customerFirstName, customerLastName, customerPhone,
      productionNotes,
    } = req.body;

    if (!items || !items.length) throw new AppError('Order must contain at least one item', 400);

    const TAX_RATE = 0.0825;

    // Resolve products
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { variants: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) throw new AppError(`Product ${item.productId} not found`, 400);

      let unitPrice = parseFloat(product.basePrice);
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId && v.isActive);
        if (!variant) throw new AppError(`Variant ${item.variantId} not found`, 400);
        unitPrice = parseFloat(variant.price);
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItemsData.push({
        productId: product.id,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        notes: item.notes || null,
      });
    }

    const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
    const tip = parseFloat(tipAmount) || 0;
    const totalAmount = Math.round((subtotal + taxAmount + tip) * 100) / 100;

    // Generate order number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });
    const orderNumber = `PCP-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Find or skip customer
    let customerId = null;
    if (customerEmail) {
      const customer = await prisma.customer.findUnique({ where: { email: customerEmail } });
      if (customer) customerId = customer.id;
    }

    // Stripe terminal payment intent if applicable
    let stripePaymentId = null;
    if (paymentMethod === 'STRIPE_TERMINAL' && totalAmount > 0) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: 'usd',
        payment_method_types: ['card_present'],
        capture_method: 'automatic',
        metadata: { source: 'pos', orderNumber },
      });
      stripePaymentId = paymentIntent.id;
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        status: paymentMethod === 'CASH' || paymentMethod === 'COMP' ? 'CONFIRMED' : 'NEW',
        fulfillmentType,
        subtotal,
        taxAmount,
        tipAmount: tip,
        totalAmount,
        paymentMethod,
        stripePaymentId,
        isPaid: paymentMethod === 'CASH' || paymentMethod === 'COMP',
        paidAt: paymentMethod === 'CASH' || paymentMethod === 'COMP' ? new Date() : null,
        isManualEntry: true,
        source: 'pos',
        guestEmail: customerEmail || null,
        guestFirstName: customerFirstName || null,
        guestLastName: customerLastName || null,
        guestPhone: customerPhone || null,
        productionNotes: productionNotes || null,
        items: { create: orderItemsData },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true } }, variant: true } },
      },
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
