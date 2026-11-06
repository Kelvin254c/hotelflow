const express = require('express');
const prisma = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const [categories, items, recipes] = await Promise.all([
    prisma.category.findMany({ orderBy: { id: 'asc' } }),
    prisma.menuItem.findMany({ orderBy: { id: 'asc' } }),
    prisma.recipe.findMany({ include: { ingredient: true } }),
  ]);

  const withAvailability = items.map((item) => {
    const parts = recipes.filter((r) => r.menuItemId === item.id && r.quantity > 0);

    // No recipe means the item is sold ready-made, so it is always available
    if (parts.length === 0) return { ...item, available: true, maxServings: null };

    const maxServings = Math.max(
      0,
      Math.floor(
        Math.min(...parts.map((r) => (r.ingredient.currentStock + 0.0005) / r.quantity))
      )
    );
    return { ...item, available: maxServings > 0, maxServings };
  });

  res.json({ categories, items: withAvailability });
});

module.exports = router;