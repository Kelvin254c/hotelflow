const express = require('express');
const prisma = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
  const items = await prisma.menuItem.findMany({ orderBy: { id: 'asc' } });
  res.json({ categories, items });
});

module.exports = router;