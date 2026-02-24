const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const stripe = require('../config/stripe');
const logger = require('../config/logger');

// Stripe webhook — must receive raw body (mounted before express.json() in app.js)
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        logger.info(`PaymentIntent ${paymentIntent.id} succeeded`);

        // Find and update the order
        const order = await prisma.order.findFirst({
          where: { stripePaymentId: paymentIntent.id },
        });

        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              isPaid: true,
              paidAt: new Date(),
            },
          });
          logger.info(`Order ${order.orderNumber} marked as paid`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        logger.warn(`PaymentIntent ${paymentIntent.id} failed: ${paymentIntent.last_payment_error?.message}`);

        const order = await prisma.order.findFirst({
          where: { stripePaymentId: paymentIntent.id },
        });

        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });
          logger.info(`Order ${order.orderNumber} cancelled due to payment failure`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        logger.info(`Charge ${charge.id} refunded`);

        if (charge.payment_intent) {
          const order = await prisma.order.findFirst({
            where: { stripePaymentId: charge.payment_intent },
          });

          if (order && order.status !== 'REFUNDED') {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: 'REFUNDED',
                stripeRefundId: charge.refunds?.data?.[0]?.id || null,
              },
            });
            logger.info(`Order ${order.orderNumber} marked as refunded`);
          }
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object;
        logger.warn(`Dispute created for charge ${dispute.charge}: ${dispute.reason}`);

        // Log for admin review
        await prisma.auditLog.create({
          data: {
            action: 'stripe.dispute.created',
            entityType: 'stripe',
            entityId: dispute.id,
            metadata: {
              chargeId: dispute.charge,
              amount: dispute.amount,
              reason: dispute.reason,
              status: dispute.status,
            },
          },
        });
        break;
      }

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`, { stack: error.stack });
    next(error);
  }
});

module.exports = router;
