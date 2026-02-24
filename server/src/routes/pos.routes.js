const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const stripe = require('../config/stripe');
const { authenticate } = require('../middleware/auth');
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
        role: { in: ['CASHIER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'BAKER'] },
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

// POST /api/pos/orders — create a POS order (walk-in or phone) — uses JWT auth
router.post('/orders', authenticate, async (req, res, next) => {
  try {
    const {
      items, fulfillmentType = 'WALKIN',
      paymentMethod = 'CASH', tipAmount = 0,
      customerEmail, customerFirstName, customerLastName, customerPhone,
      productionNotes, promoCode,
    } = req.body;

    if (!items || !items.length) throw new AppError('Order must contain at least one item', 400);

    const TAX_RATE = 0.0825;
    const DELIVERY_FEE = 5.00;

    // Resolve products
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { variants: true, addons: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) throw new AppError(`Product ${item.productId} not found`, 400);

      let unitPrice = parseFloat(product.basePrice);
      let variantId = null;
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId && v.isActive);
        if (!variant) throw new AppError(`Variant ${item.variantId} not found`, 400);
        unitPrice = parseFloat(variant.price);
        variantId = variant.id;
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      const addonData = [];
      if (item.addons?.length) {
        for (const addonReq of item.addons) {
          const addonId = typeof addonReq === 'string' ? addonReq : addonReq.addonId;
          const addonValue = typeof addonReq === 'string' ? null : (addonReq.value || null);
          const addon = product.addons.find((a) => a.id === addonId && a.isActive);
          const globalAddon = addon || await prisma.productAddon.findFirst({
            where: { id: addonId, isGlobal: true, isActive: true },
          });
          if (globalAddon) {
            const addonPrice = parseFloat(globalAddon.price);
            subtotal += addonPrice * item.quantity;
            addonData.push({ addonId: globalAddon.id, price: addonPrice, value: addonValue });
          }
        }
      }

      orderItemsData.push({
        productId: product.id,
        variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        notes: item.notes || null,
        addons: { create: addonData },
      });
    }

    // Promo
    let discountAmount = 0;
    let promoId = null;
    if (promoCode) {
      const promo = await prisma.promo.findUnique({ where: { code: promoCode.toUpperCase() } });
      if (promo && promo.isActive) {
        const now = new Date();
        const isValid = (!promo.startsAt || now >= promo.startsAt) &&
          (!promo.expiresAt || now <= promo.expiresAt) &&
          (!promo.maxUses || promo.usedCount < promo.maxUses);
        if (isValid) {
          if (promo.type === 'PERCENTAGE') {
            discountAmount = subtotal * parseFloat(promo.value) / 100;
          } else if (promo.type === 'FIXED_AMOUNT') {
            discountAmount = Math.min(parseFloat(promo.value), subtotal);
          }
          promoId = promo.id;
        }
      }
    }

    const deliveryFee = fulfillmentType === 'DELIVERY' ? DELIVERY_FEE : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * TAX_RATE * 100) / 100;
    const tip = parseFloat(tipAmount) || 0;
    const totalAmount = Math.round((taxableAmount + taxAmount + deliveryFee + tip) * 100) / 100;

    // Find or create customer
    let customerId = null;
    if (customerEmail) {
      let customer = await prisma.customer.findUnique({ where: { email: customerEmail } });
      if (!customer && customerFirstName) {
        customer = await prisma.customer.create({
          data: {
            email: customerEmail,
            firstName: customerFirstName,
            lastName: customerLastName || '',
            phone: customerPhone || null,
            isGuest: true,
          },
        });
      }
      if (customer) customerId = customer.id;
    }

    // Stripe terminal payment intent if applicable
    let stripePaymentId = null;
    if (paymentMethod === 'STRIPE_TERMINAL' && totalAmount > 0) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100),
          currency: 'usd',
          payment_method_types: ['card_present'],
          capture_method: 'automatic',
          metadata: { source: 'pos' },
        });
        stripePaymentId = paymentIntent.id;
      } catch (stripeErr) {
        throw new AppError(`Terminal payment failed: ${stripeErr.message}`, 502);
      }
    } else if (paymentMethod === 'STRIPE_CARD' && totalAmount > 0) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100),
          currency: 'usd',
          metadata: { source: 'pos' },
        });
        stripePaymentId = paymentIntent.id;
      } catch (stripeErr) {
        throw new AppError(`Card payment failed: ${stripeErr.message}`, 502);
      }
    }

    const isCashOrComp = paymentMethod === 'CASH' || paymentMethod === 'COMP';

    const result = await prisma.$transaction(async (tx) => {
      // Generate order number inside transaction
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await tx.order.count({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          },
        },
      });
      const orderNumber = `PCP-${dateStr}-${String(count + 1).padStart(4, '0')}`;

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: 'NEW',
          fulfillmentType,
          subtotal,
          taxAmount,
          deliveryFee,
          tipAmount: tip,
          discountAmount,
          totalAmount,
          paymentMethod,
          stripePaymentId,
          isPaid: isCashOrComp,
          paidAt: isCashOrComp ? new Date() : null,
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
          items: { include: { product: { select: { id: true, name: true } }, variant: true, addons: { include: { addon: true } } } },
        },
      });

      // Update promo usage
      if (promoId) {
        await tx.promo.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
        await tx.promoRedemption.create({
          data: { promoId, orderId: order.id, customerId, amount: discountAmount },
        });
      }

      return order;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
