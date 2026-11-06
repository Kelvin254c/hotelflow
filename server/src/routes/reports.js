const express = require('express');
const prisma = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('MANAGER'));

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const pctChange = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);

router.get('/', async (req, res) => {
  const requested = Number(req.query.days);
  const days = [7, 30, 90].includes(requested) ? requested : 30;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);

  const [orders, prev, ingredients, recent] = await Promise.all([
    prisma.order.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: start } },
      include: { items: { include: { menuItem: { include: { category: true } } } } },
    }),
    prisma.order.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: prevStart, lt: start } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.ingredient.findMany(),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  // Totals
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const orderCount = orders.length;
  const avgOrder = orderCount ? Math.round(revenue / orderCount) : 0;
  const itemsSold = orders.reduce(
    (s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0),
    0
  );

  // Sales per day (days with no sales show 0)
  const dailyMap = {};
  for (const o of orders) {
    const k = dayKey(o.createdAt);
    dailyMap[k] = (dailyMap[k] || 0) + o.total;
  }
  const daily = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    daily.push({
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      revenue: dailyMap[dayKey(d)] || 0,
    });
  }

  // Sales by category and top items
  const catMap = {};
  const itemMap = {};
  for (const o of orders) {
    for (const i of o.items) {
      const amount = i.unitPrice * i.quantity;
      const cat = i.menuItem.category.name;
      catMap[cat] = (catMap[cat] || 0) + amount;

      const name = i.menuItem.name;
      itemMap[name] = itemMap[name] || { name, quantity: 0, revenue: 0 };
      itemMap[name].quantity += i.quantity;
      itemMap[name].revenue += amount;
    }
  }
  const byCategory = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const topItems = Object.values(itemMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Inventory overview
  const inventory = { inStock: 0, low: 0, out: 0 };
  const lowNames = [];
  for (const g of ingredients) {
    if (g.currentStock <= 0) {
      inventory.out++;
      lowNames.push(g.name);
    } else if (g.currentStock <= g.minLevel) {
      inventory.low++;
      lowNames.push(g.name);
    } else {
      inventory.inStock++;
    }
  }

  // Insights
  const revenueChange = pctChange(revenue, prev._sum.total || 0);
  const insights = [];
  if (topItems[0]) insights.push(`${topItems[0].name} is your top seller.`);
  if (revenueChange !== null) {
    insights.push(
      `Sales ${revenueChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueChange)}% compared to the previous ${days} days.`
    );
  }
  for (const name of lowNames.slice(0, 3)) {
    insights.push(`Stock for ${name} is running low. Consider restocking.`);
  }
  if (insights.length === 0) insights.push('No insights yet. Complete some orders first.');

  res.json({
    days,
    revenue,
    revenueChange,
    orderCount,
    orderChange: pctChange(orderCount, prev._count),
    avgOrder,
    itemsSold,
    daily,
    byCategory,
    topItems,
    inventory,
    recent,
    insights,
  });
});

module.exports = router;