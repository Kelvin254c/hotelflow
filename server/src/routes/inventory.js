const express = require('express');
const prisma = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('MANAGER'));

function withStatus(item) {
  const currentStock = Math.round(item.currentStock * 1000) / 1000;
  let status = 'IN_STOCK';
  if (currentStock <= 0) status = 'OUT';
  else if (currentStock <= item.minLevel) status = 'LOW';
  return { ...item, currentStock, status };
}

function parseBody(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const unit = String(body.unit || '').trim();
  const currentStock = Number(body.currentStock);
  const minLevel = Number(body.minLevel);
  const unitCost = Number(body.unitCost);

  if (!name || !category || !unit) {
    return { error: 'Name, category and unit are required' };
  }
  if ([currentStock, minLevel, unitCost].some((n) => !Number.isFinite(n) || n < 0)) {
    return { error: 'Stock, minimum level and cost must be numbers (0 or more)' };
  }
  return {
    data: { name, category, unit, currentStock, minLevel, unitCost: Math.round(unitCost) },
  };
}

// List all ingredients + summary numbers
router.get('/', async (req, res) => {
  const rows = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  const items = rows.map(withStatus);

  const stats = {
    total: items.length,
    inStock: items.filter((i) => i.status === 'IN_STOCK').length,
    low: items.filter((i) => i.status === 'LOW').length,
    out: items.filter((i) => i.status === 'OUT').length,
    stockValue: Math.round(items.reduce((s, i) => s + i.currentStock * i.unitCost, 0)),
  };

  res.json({ items, stats });
});

// Add an ingredient
router.post('/', async (req, res) => {
  const { data, error } = parseBody(req.body);
  if (error) return res.status(400).json({ error });
  const created = await prisma.ingredient.create({ data });
  res.status(201).json(withStatus(created));
});

// Edit an ingredient (also used to restock)
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { data, error } = parseBody(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const updated = await prisma.ingredient.update({ where: { id }, data });
    res.json(withStatus(updated));
  } catch {
    res.status(404).json({ error: 'Ingredient not found' });
  }
});

// Delete an ingredient
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.ingredient.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Ingredient not found' });
  }
});

module.exports = router;