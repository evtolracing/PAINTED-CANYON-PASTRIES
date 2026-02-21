const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'];

// ─── INVENTORY ITEMS ──────────────────────────────────────

// GET /api/inventory — list inventory items
router.get('/', authenticate, authorize(...ADMIN_ROLES, 'BAKER'), async (req, res, next) => {
  try {
    const { type, search, lowStock, active, page = 1, limit = 50 } = req.query;

    const where = {};
    if (type) where.type = type;
    if (active !== undefined) where.isActive = active === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Low stock filter: items at or below reorder threshold
    if (lowStock === 'true') {
      where.currentStock = { lte: prisma.inventoryItem.fields?.reorderThreshold };
      // Prisma doesn't support column comparison directly; use raw or post-filter
      // We'll post-filter instead
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Post-filter for low stock
    if (lowStock === 'true') {
      items = items.filter((i) => parseFloat(i.currentStock) <= parseFloat(i.reorderThreshold));
      total = items.length;
    }

    res.json({
      success: true,
      data: items,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/inventory/:id
router.get('/:id', authenticate, authorize(...ADMIN_ROLES, 'BAKER'), async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        recipeItems: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });

    if (!item) throw new AppError('Inventory item not found', 404);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/inventory — create item
router.post('/', authenticate, authorize(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { name, type, unit, currentStock, reorderThreshold, cost, supplier, autoDeduct } = req.body;

    if (!name || !type || !unit) {
      throw new AppError('name, type, and unit are required', 400);
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        type,
        unit,
        currentStock: currentStock || 0,
        reorderThreshold: reorderThreshold || 0,
        cost: cost || null,
        supplier: supplier || null,
        autoDeduct: autoDeduct || false,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/inventory/:id
router.put('/:id', authenticate, authorize(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new AppError('Inventory item not found', 404);

    const { name, type, unit, reorderThreshold, cost, supplier, isActive, autoDeduct } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (unit !== undefined) updateData.unit = unit;
    if (reorderThreshold !== undefined) updateData.reorderThreshold = reorderThreshold;
    if (cost !== undefined) updateData.cost = cost;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (autoDeduct !== undefined) updateData.autoDeduct = autoDeduct;

    const item = await prisma.inventoryItem.update({ where: { id }, data: updateData });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new AppError('Inventory item not found', 404);

    await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'Inventory item deactivated' });
  } catch (error) {
    next(error);
  }
});

// ─── INVENTORY TRANSACTIONS ──────────────────────────────

// POST /api/inventory/:id/transactions — record receive/waste/adjust
router.post('/:id/transactions', authenticate, authorize(...ADMIN_ROLES, 'BAKER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, quantity, notes } = req.body;

    if (!type || quantity === undefined) {
      throw new AppError('type and quantity are required', 400);
    }

    const validTypes = ['RECEIVED', 'USED', 'WASTE', 'ADJUSTMENT'];
    if (!validTypes.includes(type)) {
      throw new AppError(`type must be one of: ${validTypes.join(', ')}`, 400);
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new AppError('Inventory item not found', 404);

    // Calculate stock change
    let stockChange = parseFloat(quantity);
    if (type === 'USED' || type === 'WASTE') {
      stockChange = -Math.abs(stockChange);
    }

    const newStock = parseFloat(item.currentStock) + stockChange;
    if (newStock < 0) {
      throw new AppError('Insufficient stock for this transaction', 400);
    }

    const [transaction] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: id,
          type,
          quantity: Math.abs(parseFloat(quantity)),
          notes: notes || null,
        },
      }),
      prisma.inventoryItem.update({
        where: { id },
        data: { currentStock: newStock },
      }),
    ]);

    res.status(201).json({
      success: true,
      data: { transaction, currentStock: newStock },
    });
  } catch (error) {
    next(error);
  }
});

// ─── PURCHASE ORDERS ─────────────────────────────────────

// GET /api/inventory/purchase-orders
router.get('/purchase-orders/list', authenticate, authorize(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 25 } = req.query;

    const where = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          items: {
            include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.purchaseOrder.count({ where }),
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

// POST /api/inventory/purchase-orders
router.post('/purchase-orders', authenticate, authorize(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const { supplier, notes, items } = req.body;

    if (!supplier || !items?.length) {
      throw new AppError('supplier and items are required', 400);
    }

    // Generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${String(count + 1).padStart(5, '0')}`;

    const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitCost)), 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplier,
        notes: notes || null,
        totalCost: Math.round(totalCost * 100) / 100,
        items: {
          create: items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        items: {
          include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
        },
      },
    });

    res.status(201).json({ success: true, data: po });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
