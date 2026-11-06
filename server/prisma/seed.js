const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // use 'bcryptjs' here if bcrypt failed to install
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // Users
  await prisma.user.createMany({
    data: [
      { name: 'Jane Smith', email: 'cashier@hotelflow.com', password, role: 'CASHIER' },
      { name: 'Admin Manager', email: 'manager@hotelflow.com', password, role: 'MANAGER' },
    ],
  });

  // Categories
  const names = ['Mayai', 'Coffee', 'Chips', 'Drinks', 'Bread', 'Meals', 'Snacks'];
  const cats = {};
  for (const name of names) {
    cats[name] = await prisma.category.create({ data: { name } });
  }

  // Menu items: [name, price in Ksh, category]
  const menu = [
    ['Mayai', 10, 'Mayai'],
    ['Chapati & beef stew', 180, 'Meals'],
    ['Chapati & beans', 160, 'Meals'],
    ['Plain chapati', 20, 'Bread'],
    ['Samosa', 30, 'Snacks'],
    ['Mandazi', 10, 'Snacks'],
    ['Coffee', 40, 'Coffee'],
    ['Tea', 30, 'Drinks'],
    ['Bread', 50, 'Bread'],
    ['Chips', 130, 'Chips'],
    ['Chicken rice', 200, 'Meals'],
    ['Beef rice', 200, 'Meals'],
  ];
  for (const [name, price, cat] of menu) {
    await prisma.menuItem.create({
      data: { name, price, categoryId: cats[cat].id },
    });
  }

  // Ingredients: [name, category, unit, current stock, minimum level, cost per unit]
  const ingredients = [
    ['Maize flour (Unga)', 'Grains', 'Kg', 25, 10, 150],
    ['Beef', 'Meat', 'Kg', 4, 10, 700],
    ['Chicken', 'Meat', 'Kg', 6, 10, 600],
    ['Tomatoes', 'Vegetables', 'Kg', 15, 10, 100],
    ['Onion', 'Vegetables', 'Kg', 12, 8, 120],
    ['Cooking oil', 'Others', 'Ltrs', 3, 5, 350],
    ['Salt', 'Spices', 'Kg', 10, 5, 60],
    ['Chapati flour', 'Grains', 'Kg', 8, 10, 160],
  ];
  for (const [name, category, unit, currentStock, minLevel, unitCost] of ingredients) {
    await prisma.ingredient.create({
      data: { name, category, unit, currentStock, minLevel, unitCost },
    });
  }

  console.log('Database seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());