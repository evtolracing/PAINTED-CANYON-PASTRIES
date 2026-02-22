const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const stripe = require('../config/stripe');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const { createOrderSchema, updateOrderStatusSchema } = require('../validators/order.validator');

// ─── HELPERS ──────────────────────────────────────────────

const TAX_RATE = 0.0825; // 8.25% — configurable via settings in prod
const DELIVERY_FEE = 5.00;

async function generateOrderNumber(tx) {
  const db = tx || prisma;
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PCP-${dateStr}-`;

  // Find the highest existing order number for today to avoid duplicates
  const lastOrder = await db.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  let nextNum = 1;
  if (lastOrder) {
    const lastNum = parseInt(lastOrder.orderNumber.split('-').pop(), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// ─── CREATE ORDER ─────────────────────────────────────────

router.post('/', optionalAuth, validate(createOrderSchema), async (req, res, next) => {
  try {
    const {
      items, fulfillmentType, scheduledDate, timeslotId,
      deliveryAddress, deliveryZip, deliveryNotes,
      paymentMethod, tipAmount, promoCode,
      guestEmail, guestFirstName, guestLastName, guestPhone,
      productionNotes, source, isManualEntry,
    } = req.body;

    // ── Resolve line items & calculate prices ──
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
      if (!product) throw new AppError(`Product ${item.productId} not found or inactive`, 400);

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
          // Support both { addonId } and plain string ID
          const addonId = typeof addonReq === 'string' ? addonReq : addonReq.addonId;
          const addonValue = typeof addonReq === 'string' ? null : (addonReq.value || null);

          const addon = product.addons.find((a) => a.id === addonId && a.isActive);
          // Also check global addons
          const globalAddon = addon || await prisma.productAddon.findFirst({
            where: { id: addonId, isGlobal: true, isActive: true },
          });
          if (!globalAddon) throw new AppError(`Addon ${addonId} not found`, 400);

          const addonPrice = parseFloat(globalAddon.price);
          subtotal += addonPrice * item.quantity;

          addonData.push({
            addonId: globalAddon.id,
            price: addonPrice,
            value: addonValue,
          });
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

    // ── Promo ──
    let discountAmount = 0;
    let promoId = null;
    if (promoCode) {
      const promo = await prisma.promo.findUnique({ where: { code: promoCode.toUpperCase() } });
      if (!promo || !promo.isActive) throw new AppError('Invalid promo code', 400);

      const now = new Date();
      if (promo.startsAt && now < promo.startsAt) throw new AppError('Promo not yet active', 400);
      if (promo.expiresAt && now > promo.expiresAt) throw new AppError('Promo has expired', 400);
      if (promo.maxUses && promo.usedCount >= promo.maxUses) throw new AppError('Promo usage limit reached', 400);
      if (promo.minOrderAmount && subtotal < parseFloat(promo.minOrderAmount)) {
        throw new AppError(`Minimum order of $${promo.minOrderAmount} required`, 400);
      }

      if (promo.type === 'PERCENTAGE') {
        discountAmount = subtotal * parseFloat(promo.value) / 100;
      } else if (promo.type === 'FIXED_AMOUNT') {
        discountAmount = Math.min(parseFloat(promo.value), subtotal);
      }
      promoId = promo.id;
    }

    // ── Totals ──
    const deliveryFee = fulfillmentType === 'DELIVERY' ? DELIVERY_FEE : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * TAX_RATE * 100) / 100;
    const totalAmount = Math.round((taxableAmount + taxAmount + deliveryFee + (tipAmount || 0)) * 100) / 100;

    // ── Customer linkage ──
    let customerId = null;
    if (req.user) {
      let customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
      if (!customer) {
        // Auto-create customer record for registered users who don't have one
        customer = await prisma.customer.create({
          data: {
            userId: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName || '',
            lastName: req.user.lastName || '',
            phone: req.user.phone || null,
          },
        });
      }
      customerId = customer.id;
    }

    // ── Stripe payment intent ──
    let stripePaymentId = null;
    let clientSecret = null;
    const effectivePayment = paymentMethod || 'STRIPE_CARD';
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const stripeConfigured = stripeKey && !stripeKey.includes('placeholder') && stripeKey.startsWith('sk_');

    if (effectivePayment === 'STRIPE_CARD' && totalAmount > 0 && stripeConfigured) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // cents
          currency: 'usd',
          metadata: { source: source || 'web' },
        });
        stripePaymentId = paymentIntent.id;
        clientSecret = paymentIntent.client_secret;
      } catch (stripeErr) {
        throw new AppError(`Payment processing failed: ${stripeErr.message}`, 502);
      }
    } else if (effectivePayment === 'STRIPE_TERMINAL' && totalAmount > 0 && stripeConfigured) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100),
          currency: 'usd',
          payment_method_types: ['card_present'],
          capture_method: 'automatic',
          metadata: { source: source || 'pos' },
        });
        stripePaymentId = paymentIntent.id;
        clientSecret = paymentIntent.client_secret;
      } catch (stripeErr) {
        throw new AppError(`Terminal payment failed: ${stripeErr.message}`, 502);
      }
    }

    // ── Create order in a transaction ──
    const isCashOrComp = effectivePayment === 'CASH' || effectivePayment === 'COMP';
    const skipStripe = !stripeConfigured && (effectivePayment === 'STRIPE_CARD' || effectivePayment === 'STRIPE_TERMINAL');
    const autoConfirm = isCashOrComp || skipStripe;
    const orderSrc = source || 'web';

    const result = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: autoConfirm ? 'CONFIRMED' : 'NEW',
          fulfillmentType,
          subtotal,
          taxAmount,
          deliveryFee,
          tipAmount: tipAmount || 0,
          discountAmount,
          totalAmount,
          paymentMethod: effectivePayment,
          stripePaymentId,
          isPaid: autoConfirm,
          paidAt: autoConfirm ? new Date() : null,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          timeslotId: timeslotId || null,
          scheduledSlot: timeslotId ? undefined : null,
          deliveryAddress: deliveryAddress || null,
          deliveryZip: deliveryZip || null,
          deliveryNotes: deliveryNotes || null,
          productionNotes: productionNotes || null,
          isManualEntry: isManualEntry || orderSrc === 'pos',
          source: orderSrc,
          guestEmail: guestEmail || null,
          guestFirstName: guestFirstName || null,
          guestLastName: guestLastName || null,
          guestPhone: guestPhone || null,
          items: { create: orderItemsData },
        },
        include: {
          items: { include: { product: true, variant: true, addons: { include: { addon: true } } } },
          customer: true,
        },
      });

      // ── Update promo usage ──
      if (promoId) {
        await tx.promo.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
        await tx.promoRedemption.create({
          data: { promoId, orderId: order.id, customerId, amount: discountAmount },
        });
      }

      // ── Update timeslot count ──
      if (timeslotId) {
        await tx.timeslot.update({ where: { id: timeslotId }, data: { currentCount: { increment: 1 } } });
      }

      return order;
    });

    res.status(201).json({
      success: true,
      data: { order: result, clientSecret },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET ORDERS ───────────────────────────────────────────

// GET /api/orders/my — customer's own orders (shortcut)
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return res.json({ success: true, data: [] });

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, basePrice: true, images: { where: { isPrimary: true }, take: 1 } } },
            variant: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/by-number/:orderNumber — lookup by order number (for confirmation page)
router.get('/by-number/:orderNumber', optionalAuth, async (req, res, next) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
            variant: { select: { id: true, name: true } },
            addons: { include: { addon: { select: { id: true, name: true } } } },
          },
        },
        timeslot: true,
      },
    });

    if (!order) throw new AppError('Order not found', 404);

    // If authenticated, verify it's their order or they're admin
    if (req.user) {
      const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'BAKER'].includes(req.user.role);
      if (!isAdmin) {
        const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
        if (customer && order.customerId && order.customerId !== customer.id) {
          throw new AppError('Order not found', 404);
        }
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders — admin: all, customer: own
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      status, fulfillmentType, source, search,
      startDate, endDate,
      sortBy = 'createdAt', sortDir = 'desc',
      page = 1, limit = 25,
    } = req.query;

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'BAKER'].includes(req.user.role);
    const where = {};

    if (!isAdmin) {
      // Customers can only see their own orders
      const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
      if (!customer) return res.json({ success: true, data: [], meta: { total: 0 } });
      where.customerId = customer.id;
    }

    if (status) where.status = status;
    if (fulfillmentType) where.fulfillmentType = fulfillmentType;
    if (source) where.source = source;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { guestEmail: { contains: search, mode: 'insensitive' } },
        { guestFirstName: { contains: search, mode: 'insensitive' } },
        { guestLastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const allowedSort = ['createdAt', 'totalAmount', 'orderNumber', 'status'];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: { include: { product: { select: { id: true, name: true } }, variant: true } },
        },
        orderBy: { [orderField]: sortDir === 'asc' ? 'asc' : 'desc' },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedBaker: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
            variant: true,
            addons: { include: { addon: true } },
          },
        },
        promoRedemptions: { include: { promo: { select: { code: true, type: true, value: true } } } },
        timeslot: true,
      },
    });

    if (!order) throw new AppError('Order not found', 404);

    // Customers can only see their own
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'BAKER'].includes(req.user.role);
    if (!isAdmin) {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
      if (!customer || order.customerId !== customer.id) {
        throw new AppError('Order not found', 404);
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ────────────────────────────────────────────────

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'BAKER'), validate(updateOrderStatusSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, productionNotes, assignedBakerId, packagingChecklist } = req.body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new AppError('Order not found', 404);

    const updateData = { status };
    if (productionNotes !== undefined) updateData.productionNotes = productionNotes;
    if (assignedBakerId !== undefined) updateData.assignedBakerId = assignedBakerId;
    if (packagingChecklist !== undefined) updateData.packagingChecklist = packagingChecklist;

    // Mark as paid when completed if paid via Stripe and confirmed
    if (status === 'COMPLETED' && existing.stripePaymentId && !existing.isPaid) {
      updateData.isPaid = true;
      updateData.paidAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

// POST /api/orders/:id/refund
router.post('/:id/refund', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new AppError('Order not found', 404);

    let stripeRefundId = null;
    if (order.stripePaymentId) {
      const refundParams = {
        payment_intent: order.stripePaymentId,
        reason: reason || 'requested_by_customer',
      };
      if (amount) {
        refundParams.amount = Math.round(amount * 100); // partial refund in cents
      }

      const refund = await stripe.refunds.create(refundParams);
      stripeRefundId = refund.id;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        stripeRefundId,
      },
    });

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
