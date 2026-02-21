const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'];

// GET /api/analytics/sales — sales summary
router.get('/sales', authenticate, authorize(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      select: {
        totalAmount: true,
        subtotal: true,
        taxAmount: true,
        tipAmount: true,
        deliveryFee: true,
        discountAmount: true,
        fulfillmentType: true,
        paymentMethod: true,
        source: true,
        createdAt: true,
        isPaid: true,
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
    const totalSubtotal = orders.reduce((sum, o) => sum + parseFloat(o.subtotal), 0);
    const totalTax = orders.reduce((sum, o) => sum + parseFloat(o.taxAmount), 0);
    const totalTips = orders.reduce((sum, o) => sum + parseFloat(o.tipAmount), 0);
    const totalDeliveryFees = orders.reduce((sum, o) => sum + parseFloat(o.deliveryFee), 0);
    const totalDiscounts = orders.reduce((sum, o) => sum + parseFloat(o.discountAmount), 0);
    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;

    // Group by day/week/month
    const grouped = {};
    for (const order of orders) {
      let key;
      const d = order.createdAt;
      if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = d.toISOString().slice(0, 10);
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, revenue: 0, orderCount: 0 };
      }
      grouped[key].revenue += parseFloat(order.totalAmount);
      grouped[key].orderCount += 1;
    }

    // Breakdown by source and fulfillment type
    const bySource = {};
    const byFulfillment = {};
    const byPayment = {};
    for (const order of orders) {
      bySource[order.source] = (bySource[order.source] || 0) + 1;
      byFulfillment[order.fulfillmentType] = (byFulfillment[order.fulfillmentType] || 0) + 1;
      byPayment[order.paymentMethod] = (byPayment[order.paymentMethod] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalSubtotal: Math.round(totalSubtotal * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
          totalTips: Math.round(totalTips * 100) / 100,
          totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
          totalDiscounts: Math.round(totalDiscounts * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          orderCount: orders.length,
        },
        timeline: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
        bySource,
        byFulfillment,
        byPayment,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/top-products
router.get('/top-products', authenticate, authorize(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      select: {
        productId: true,
        quantity: true,
        totalPrice: true,
        product: { select: { id: true, name: true, slug: true, basePrice: true } },
      },
    });

    // Aggregate by product
    const productStats = {};
    for (const item of orderItems) {
      if (!productStats[item.productId]) {
        productStats[item.productId] = {
          product: item.product,
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0,
        };
      }
      productStats[item.productId].totalQuantity += item.quantity;
      productStats[item.productId].totalRevenue += parseFloat(item.totalPrice);
      productStats[item.productId].orderCount += 1;
    }

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, parseInt(limit))
      .map((p) => ({
        ...p,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
      }));

    res.json({ success: true, data: topProducts });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/fulfillment — fulfillment stats
router.get('/fulfillment', authenticate, authorize(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: {
        status: true,
        fulfillmentType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Status counts
    const statusCounts = {};
    for (const order of orders) {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    }

    // Fulfillment type counts
    const fulfillmentCounts = {};
    for (const order of orders) {
      fulfillmentCounts[order.fulfillmentType] = (fulfillmentCounts[order.fulfillmentType] || 0) + 1;
    }

    // Average time from NEW to COMPLETED
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
    let avgFulfillmentMinutes = null;
    if (completedOrders.length) {
      const totalMinutes = completedOrders.reduce((sum, o) => {
        return sum + (o.updatedAt.getTime() - o.createdAt.getTime()) / 60000;
      }, 0);
      avgFulfillmentMinutes = Math.round(totalMinutes / completedOrders.length);
    }

    // Pending orders (actionable)
    const pendingCounts = await prisma.order.groupBy({
      by: ['status'],
      where: { status: { in: ['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'OUT_FOR_DELIVERY'] } },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        statusCounts,
        fulfillmentCounts,
        avgFulfillmentMinutes,
        totalOrders: orders.length,
        pending: pendingCounts.map((p) => ({ status: p.status, count: p._count })),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
