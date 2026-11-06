const express = require('express');
const prisma = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const TAX_RATE = 0.08; // change to 0.16 if you want Kenyan VAT

router.post('/', verifyToken, async (req, res) => {
  const { items, payMethod } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order has no items' });
  }
  if (!['MPESA', 'CASH', 'OTHER'].includes(payMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

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

  const order = await prisma.order.create({
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

  res.status(201).json(order);
});

module.exports = router;