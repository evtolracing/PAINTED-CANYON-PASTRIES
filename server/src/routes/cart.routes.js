const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// POST /api/cart/validate — validate cart items and return calculated pricing
router.post('/validate', optionalAuth, async (req, res, next) => {
  try {
    const { items, fulfillmentType, promoCode, tipAmount = 0 } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Cart must contain at least one item', 400);
    }

    const TAX_RATE = 0.0825;
    const DELIVERY_FEE = 5.00;

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        addons: { where: { isActive: true } },
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const validatedItems = [];
    const warnings = [];

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) {
        warnings.push({ productId: item.productId, message: 'Product not found or unavailable' });
        continue;
      }

      let unitPrice = parseFloat(product.basePrice);
      let variantName = null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          warnings.push({ productId: item.productId, message: `Variant ${item.variantId} not available` });
          continue;
        }
        unitPrice = parseFloat(variant.price);
        variantName = variant.name;
      }

      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      let itemTotal = unitPrice * quantity;

      const resolvedAddons = [];
      if (item.addons?.length) {
        for (const addonReq of item.addons) {
          const addon = product.addons.find((a) => a.id === addonReq.addonId) ||
            await prisma.productAddon.findFirst({ where: { id: addonReq.addonId, isGlobal: true, isActive: true } });
          if (addon) {
            const addonPrice = parseFloat(addon.price);
            itemTotal += addonPrice * quantity;
            resolvedAddons.push({ addonId: addon.id, name: addon.name, price: addonPrice });
          }
        }
      }

      subtotal += itemTotal;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        variantId: item.variantId || null,
        variantName,
        unitPrice,
        quantity,
        addons: resolvedAddons,
        lineTotal: itemTotal,
        image: product.images[0]?.url || null,
      });
    }

    // Promo
    let discountAmount = 0;
    let promoData = null;
    if (promoCode) {
      const promo = await prisma.promo.findUnique({ where: { code: promoCode.toUpperCase() } });
      if (promo && promo.isActive) {
        const now = new Date();
        const isValid = (!promo.startsAt || now >= promo.startsAt) &&
          (!promo.expiresAt || now <= promo.expiresAt) &&
          (!promo.maxUses || promo.usedCount < promo.maxUses) &&
          (!promo.minOrderAmount || subtotal >= parseFloat(promo.minOrderAmount));

        if (isValid) {
          if (promo.type === 'PERCENTAGE') {
            discountAmount = subtotal * parseFloat(promo.value) / 100;
          } else if (promo.type === 'FIXED_AMOUNT') {
            discountAmount = Math.min(parseFloat(promo.value), subtotal);
          }
          promoData = { code: promo.code, type: promo.type, value: promo.value, discount: discountAmount };
        } else {
          warnings.push({ message: 'Promo code is not valid for this order' });
        }
      } else {
        warnings.push({ message: 'Invalid promo code' });
      }
    }

    const deliveryFee = fulfillmentType === 'DELIVERY' ? DELIVERY_FEE : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * TAX_RATE * 100) / 100;
    const tip = Math.max(0, parseFloat(tipAmount) || 0);
    const totalAmount = Math.round((taxableAmount + taxAmount + deliveryFee + tip) * 100) / 100;

    res.json({
      success: true,
      data: {
        items: validatedItems,
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        taxAmount,
        deliveryFee,
        tipAmount: tip,
        totalAmount,
        promo: promoData,
        warnings: warnings.length ? warnings : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
