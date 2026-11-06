const express = require('express');
const prisma = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const TAX_RATE = 0.08; // change to 0.16 for Kenyan VAT (also change it in Cashier.jsx)

// true  = refuse the sale if any ingredient is short
// false = allow the sale anyway and set the short ingredient to 0
const BLOCK_WHEN_SHORT = true;

// Small tolerance so decimal rounding does not cause false "not enough stock" results
const TOLERANCE = 0.0005;

const round = (n) => Math.round(n * 10000) / 10000;

class StockError extends Error {}

router.post('/', verifyToken, async (req, res) => {
  const { items, payMethod } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order has no items' });
  }
  if (!['MPESA', 'CASH', 'OTHER'].includes(payMethod)) {
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

    // Work out how much of each ingredient this order uses up
    const recipeRows = await prisma.recipe.findMany({
      where: { menuItemId: { in: ids } },
      include: { ingredient: true },
    });

    const needs = {}; // ingredientId -> { name, unit, amount }
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