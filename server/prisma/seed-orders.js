const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TAX_RATE = 0.08;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  const cashier = await prisma.user.findUnique({
    where: { email: 'cashier@hotelflow.com' },
  });
  const menu = await prisma.menuItem.findMany();
  const methods = ['MPESA', 'MPESA', 'CASH', 'OTHER'];

  for (let d = 29; d >= 0; d--) {
    const count = rand(5, 12);
    for (let n = 0; n < count; n++) {
      const when = new Date();
      when.setDate(when.getDate() - d);
      when.setHours(rand(8, 20), rand(0, 59), 0, 0);

      const lines = Array.from({ length: rand(1, 4) }, () => {
        const m = pick(menu);
        return { menuItemId: m.id, quantity: rand(1, 3), unitPrice: m.price };
      });
      const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
      const tax = Math.round(subtotal * TAX_RATE);

      await prisma.order.create({
        data: {
          status: 'COMPLETED',
          subtotal,
          tax,
          total: subtotal + tax,
          payMethod: pick(methods),
          createdAt: when,
          cashierId: cashier.id,
          items: { create: lines },
        },
      });
    }
  }
  console.log('Sample orders added!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());