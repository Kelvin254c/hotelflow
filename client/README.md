# Hotelflow – Kenyan Restaurant POS

Hotelflow is a point-of-sale system for small restaurants. Cashiers take orders, managers track ingredient stock and view sales reports, and everything is saved in one PostgreSQL database.

## Features

- **Login with roles:** cashier and manager accounts, with protected pages (JWT authentication, bcrypt-hashed passwords)
- **Cashier dashboard:** browse the menu by category, search, build an order, see subtotal and tax, choose a payment method (Mpesa, Cash, Other) and check out
- **Inventory:** view ingredients with stock status (In Stock / Low / Out), filter and search, add, edit and delete ingredients, low-stock alerts, total stock value
- **Manager dashboard:** revenue, order count, average order value, items sold, sales chart, sales by category, top-selling items, recent orders and automatic business insights
- **Server-side pricing:** the server recalculates prices and tax from the database, so totals cannot be changed from the browser

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL with Prisma ORM |
| Auth | JSON Web Tokens (JWT), bcrypt |

## Prerequisites

- [Node.js](https://nodejs.org) (LTS version)
- [PostgreSQL](https://www.postgresql.org/download/) (includes pgAdmin)
- [Git](https://git-scm.com)

## Getting started

### 1. Clone the project

```bash
git clone https://github.com/<your-username>/hotelflow.git
cd hotelflow
```

### 2. Create the database

Open pgAdmin, right-click **Databases → Create → Database**, and name it `hotelflow`.

### 3. Set up the server

```bash
cd server
npm install
```

Create a file named `.env` inside the `server` folder (see `.env.example`):

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/hotelflow"
JWT_SECRET="any-long-random-text"
```

Replace `YOUR_PASSWORD` with your PostgreSQL password. If your password contains symbols such as `@` or `#`, they must be URL-encoded (for example `@` becomes `%40`).

Create the tables and add starter data:

```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

Optional: add about 30 days of sample orders so the manager charts have data (run this only once):

```bash
node prisma/seed-orders.js
```

Start the server:

```bash
npm run dev
```

It runs at http://localhost:5000. Check http://localhost:5000/api/health, which should return `{"status":"ok"}`.

### 4. Set up the client

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Test accounts

| Role | Email | Password |
|---|---|---|
| Cashier | cashier@hotelflow.com | password123 |
| Manager | manager@hotelflow.com | password123 |

These accounts are for development only. Change them before using the system for real.

## Project structure

```
hotelflow/
├── client/                  React frontend
│   └── src/
│       ├── pages/           Login, Cashier, Inventory, Manager
│       ├── components/      Sidebar
│       ├── context/         AuthContext (login state)
│       └── api.js           helper that sends the login token
└── server/                  Express backend
    ├── prisma/
    │   ├── schema.prisma    database tables
    │   ├── seed.js          starter users, menu, ingredients
    │   └── seed-orders.js   sample orders for testing
    └── src/
        ├── index.js         server entry point
        ├── db.js            shared Prisma client
        ├── middleware/      login and role checks
        └── routes/          auth, menu, orders, inventory, reports
```

## API overview

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Log in and receive a token |
| GET | `/api/menu` | Logged in | Menu items and categories |
| POST | `/api/orders` | Logged in | Create an order |
| GET | `/api/inventory` | Manager | List ingredients and stock stats |
| POST | `/api/inventory` | Manager | Add an ingredient |
| PATCH | `/api/inventory/:id` | Manager | Edit an ingredient |
| DELETE | `/api/inventory/:id` | Manager | Delete an ingredient |
| GET | `/api/reports?days=30` | Manager | Dashboard figures (7, 30 or 90 days) |

## Useful commands

| Command | What it does |
|---|---|
| `npx prisma studio` | Opens a browser view of all database tables |
| `npx prisma migrate reset` | Wipes the database and recreates the tables (run the seed again after) |
| `npx prisma generate` | Regenerates the Prisma client if it says it is not initialized |

## Troubleshooting

- **"Failed to fetch" in the browser:** the server is not running or has crashed. Check the server terminal.
- **"Authentication failed" from Prisma:** the password in `server/.env` does not match your PostgreSQL password.
- **"Can't reach database server":** PostgreSQL is not running, or the port in `DATABASE_URL` is wrong (the default is 5432).
- **"@prisma/client did not initialize yet":** run `npx prisma generate`.
- **PowerShell blocks npm scripts:** run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

## Known limitations

- The **Mpesa** option only records the payment method. Real payments (Safaricom Daraja STK Push) are not integrated yet.
- Stock is **not deducted automatically** when an order is placed. Recipes linking menu items to ingredients are not built yet.
- The tax rate is set to 8% in `server/src/routes/orders.js` and `client/src/pages/Cashier.jsx`. Change it in both files together (for example to 16% for Kenyan VAT).
- Menu items show a letter instead of a photo.

## Roadmap

- Automatic stock deduction using recipes
- Order history and printable receipts
- Mpesa payments through the Daraja API
- Food photos on the menu
- Managing menu items and users from the app
- Deployment

## License

This project was built for learning. Add a license before sharing it more widely.