const Joi = require('joi');

const createOrderSchema = Joi.object({
  fulfillmentType: Joi.string().valid('PICKUP', 'DELIVERY', 'WALKIN').required(),
  items: Joi.array().items(Joi.object({
    productId: Joi.string().uuid().required(),
    variantId: Joi.string().uuid().allow(null),
    quantity: Joi.number().integer().min(1).required(),
    notes: Joi.string().max(500).allow('', null),
    addons: Joi.array().items(
      Joi.alternatives().try(
        Joi.object({
          addonId: Joi.string().uuid().required(),
          value: Joi.string().max(500).allow('', null),
        }),
        Joi.string().uuid()
      )
    ).default([]),
  })).min(1).required(),

  // Scheduling
  scheduledDate: Joi.date().allow(null),
  timeslotId: Joi.string().uuid().allow(null),

  // Delivery
  deliveryAddress: Joi.string().max(500).allow('', null)
    .when('fulfillmentType', { is: 'DELIVERY', then: Joi.string().min(1).required() }),
  deliveryZip: Joi.string().max(10).allow('', null),
  deliveryNotes: Joi.string().max(500).allow('', null),

  // Payment
  paymentMethod: Joi.string().valid('STRIPE_CARD', 'STRIPE_TERMINAL', 'CASH', 'COMP').default('STRIPE_CARD'),
  stripePaymentIntentId: Joi.string().allow(null),

  // Tips and promos
  tipAmount: Joi.number().min(0).precision(2).default(0),
  promoCode: Joi.string().max(50).allow('', null),

  // Guest info
  guestEmail: Joi.string().email().allow('', null),
  guestFirstName: Joi.string().max(50).allow('', null),
  guestLastName: Joi.string().max(50).allow('', null),
  guestPhone: Joi.string().max(20).allow('', null),

  // Internal
  productionNotes: Joi.string().max(1000).allow('', null),
  source: Joi.string().valid('web', 'pos', 'phone').default('web'),
  isManualEntry: Joi.boolean().default(false),
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid(
    'NEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY',
    'OUT_FOR_DELIVERY', 'COMPLETED', 'REFUNDED', 'CANCELLED'
  ).required(),
  productionNotes: Joi.string().max(1000).allow('', null),
  assignedBakerId: Joi.string().uuid().allow(null),
  packagingChecklist: Joi.object().allow(null),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
