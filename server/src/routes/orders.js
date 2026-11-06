const express = require('express');
const prisma = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const TAX_RATE = 0.08; // change to 0.16 for Kenyan VAT (also change it in Cashier.jsx)
const BLOCK_WHEN_SHORT = true; // true = refuse the sale if an ingredient is short
const TOLERANCE = 0.0005;
const PAGE_SIZE = 15;
const PAY_METHODS = ['MPESA', 'CASH', 'OTHER'];

const round = (n) => Math.round(n * 10000) / 10000;

class StockError extends Error {}

// ---------- List orders (history) ----------
router.get('/', verifyToken, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const where = {};

  if (req.user.role !== 'MANAGER') where.cashierId = req.user.id;
  if (PAY_METHODS.includes(req.query.payMethod)) where.payMethod = req.query.payMethod;

  const search = String(req.query.search || '').trim().replace('#', '');
  if (search) where.id = /^\d{1,9}$/.test(search) ? Number(search) : -1;

  const createdAt = {};
  if (req.query.from) {
    const d = new Date(`${req.query.from}T00:00:00`);
    if (!isNaN(d)) createdAt.gte = d;
  }
  if (req.query.to) {
    const d = new Date(`${req.query.to}T23:59:59.999`);
    if (!isNaN(d)) createdAt.lte = d;
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { cashier: { select: { name: true } }, items: true },
    }),
  ]);

  const orders = rows.map(({ items, ...o }) => ({
    ...o,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
  }));

  res.json({ orders, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
});

// ---------- One order (for the receipt) ----------
router.get('/:id', verifyToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      cashier: { select: { name: true } },
      items: { include: { menuItem: { select: { name: true } } } },
    },
  });

  if (!order || (req.user.role !== 'MANAGER' && order.cashierId !== req.user.id)) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// ---------- Create an order ----------
router.post('/', verifyToken, async (req, res) => {
  const { items, payMethod, amountReceived } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order has no items' });
  }
  if (!PAY_METHODS.includes(payMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  try {
    const ids = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids } } });

    const lines = [];
    for (const i of items) {
      const menuItem = menuItems.find((m) => m.id === i.menuItemId);
      if (!menuItem || !Number.isInteger(i.quantity) || i.quantity < 1) {
        return res.status(400).json({ error: 'Invalid item in order' });
      }
      lines.push({
        menuItemId: menuItem.id,
        quantity: i.quantity,
        unitPrice: menuItem.price,
      });
    }

    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;

    // Cash orders must be paid in full
    let received = null;
    if (payMethod === 'CASH') {
      received = Math.round(Number(amountReceived));
      if (!Number.isFinite(received) || received < total) {
        return res.status(400).json({ error: 'Cash received is less than the total' });
      }
    }

    // Work out how much of each ingredient this order uses up
    const recipeRows = await prisma.recipe.findMany({
      where: { menuItemId: { in: ids } },
      include: { ingredient: true },
    });

    const needs = {};
    for (const line of lines) {
      for (const r of recipeRows.filter((r) => r.menuItemId === line.menuItemId)) {
        const need = needs[r.ingredientId] || {
          name: r.ingredient.name,
          unit: r.ingredient.unit,
          amount: 0,
        };
        need.amount = round(need.amount + r.quantity * line.quantity);
        needs[r.ingredientId] = need;
      }
    }

    // Save the order and deduct stock together. If anything fails, nothing is saved.
    const order = await prisma.$transaction(async (tx) => {
      const short = [];

      for (const [id, need] of Object.entries(needs)) {
        const result = await tx.ingredient.updateMany({
          where: { id: Number(id), currentStock: { gte: need.amount - TOLERANCE } },
          data: { currentStock: { decrement: need.amount } },
        });

        if (result.count === 0) {
          short.push(`${need.name} (need ${need.amount} ${need.unit})`);
          if (!BLOCK_WHEN_SHORT) {
            await tx.ingredient.update({
              where: { id: Number(id) },
              data: { currentStock: 0 },
            });
          }
        }
      }

      if (short.length > 0 && BLOCK_WHEN_SHORT) {
        throw new StockError(`Not enough stock for: ${short.join(', ')}`);
      }

      return tx.order.create({
        data: {
          status: 'COMPLETED',
          subtotal,
          tax,
          total,
          payMethod,
          amountReceived: received,
          cashierId: req.user.id,
          items: { create: lines },
        },
        include: { items: true },
      });
    });

    res.status(201).json(order);
  } catch (err) {
    if (err instanceof StockError) {
      return res.status(409).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not save the order' });
  }
});

module.exports = router;