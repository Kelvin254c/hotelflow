const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Extra ingredients the recipes need: [name, category, unit, stock, minimum, cost per unit]
const newIngredients = [
  ['Eggs', 'Others', 'Pcs', 60, 20, 15],
  ['Beans', 'Grains', 'Kg', 10, 5, 200],
  ['Rice', 'Grains', 'Kg', 20, 10, 180],
  ['Potatoes', 'Vegetables', 'Kg', 25, 10, 80],
  ['Milk', 'Others', 'Ltrs', 10, 5, 70],
];

// Menu item -> [ingredient, amount used per serving]
// Items not listed here (like Bread) are sold ready-made and use no ingredients.
const recipes = {
  'Mayai': [['Eggs', 1], ['Cooking oil', 0.01]],
  'Chapati & beef stew': [
    ['Chapati flour', 0.1], ['Beef', 0.15], ['Tomatoes', 0.05],
    ['Onion', 0.03], ['Cooking oil', 0.03],
  ],
  'Chapati & beans': [
    ['Chapati flour', 0.1], ['Beans', 0.15], ['Tomatoes', 0.03],
    ['Onion', 0.02], ['Cooking oil', 0.03],
  ],
  'Plain chapati': [['Chapati flour', 0.1], ['Cooking oil', 0.02]],
  'Samosa': [
    ['Chapati flour', 0.04], ['Beef', 0.03], ['Onion', 0.02], ['Cooking oil', 0.03],
  ],
  'Mandazi': [['Chapati flour', 0.06], ['Cooking oil', 0.04]],
  'Coffee': [['Milk', 0.1]],
  'Tea': [['Milk', 0.1]],
  'Chips': [['Potatoes', 0.3], ['Cooking oil', 0.1], ['Salt', 0.005]],
  'Chicken rice': [
    ['Rice', 0.2], ['Chicken', 0.2], ['Onion', 0.03],
    ['Tomatoes', 0.05], ['Cooking oil', 0.03],
  ],
  'Beef rice': [
    ['Rice', 0.2], ['Beef', 0.15], ['Onion', 0.03],
    ['Tomatoes', 0.05], ['Cooking oil', 0.03],
  ],
};

async function main() {
  // Add the new ingredients (skips any that already exist)
  for (const [name, category, unit, currentStock, minLevel, unitCost] of newIngredients) {
    const exists = await prisma.ingredient.findFirst({ where: { name } });
    if (!exists) {
      await prisma.ingredient.create({
        data: { name, category, unit, currentStock, minLevel, unitCost },
      });
    }
  }

  const ingredients = await prisma.ingredient.findMany();
  const menuItems = await prisma.menuItem.findMany();
  const ingByName = Object.fromEntries(ingredients.map((i) => [i.name, i]));
  const menuByName = Object.fromEntries(menuItems.map((m) => [m.name, m]));

  // Clear old recipes so this script is safe to run again
  await prisma.recipe.deleteMany();

  for (const [menuName, parts] of Object.entries(recipes)) {
    const menuItem = menuByName[menuName];
    if (!menuItem) {
      console.log(`Skipped: menu item "${menuName}" not found`);
      continue;
    }
    for (const [ingName, quantity] of parts) {
      const ingredient = ingByName[ingName];
      if (!ingredient) {
        console.log(`Skipped: ingredient "${ingName}" not found`);
        continue;
      }
      await prisma.recipe.create({
        data: { menuItemId: menuItem.id, ingredientId: ingredient.id, quantity },
      });
    }
  }

  console.log('Recipes added!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());