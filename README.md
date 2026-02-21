# 🌵 Painted Canyon Pastries

A full-stack web platform for an online bakery brand, featuring ecommerce, an admin dashboard, a POS system, and an AI-powered knowledge base assistant.

## Tech Stack

| Layer     | Technology                         |
| --------- | ---------------------------------- |
| Frontend  | React 18, Material UI 6            |
| Backend   | Node.js, Express 4                 |
| Database  | PostgreSQL (Supabase) via Prisma   |
| Payments  | Stripe                             |
| AI        | OpenAI / Anthropic (pluggable)     |
| Email     | Nodemailer (SMTP)                  |

---

## Prerequisites

- Node.js >= 18
- A Supabase project (free tier works)
- Stripe account (test keys)
- (Optional) OpenAI or Anthropic API key for AI features

---

## Getting Started

### 1. Clone & install

```bash
cd "PAINTED CANYON PASTRIES"
npm install          # root workspace deps
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Configure environment

Copy the example env and fill in your keys:

```bash
cp .env.example .env
```

Required values:

| Variable               | Where to find it                                     |
| ---------------------- | ---------------------------------------------------- |
| `DATABASE_URL`         | Supabase > Settings > Database > Connection string   |
| `DIRECT_URL`           | Supabase > Settings > Database > Direct connection    |
| `JWT_SECRET`           | Any random string (e.g. `openssl rand -base64 32`)   |
| `STRIPE_SECRET_KEY`    | Stripe Dashboard > Developers > API keys             |
| `STRIPE_PUBLISHABLE_KEY` | Same Stripe page                                  |
| `STRIPE_WEBHOOK_SECRET`  | Stripe CLI or Dashboard > Webhooks                |

Optional (AI features):

| Variable               | Notes                         |
| ---------------------- | ----------------------------- |
| `OPENAI_API_KEY`       | For AI assistant & embeddings |
| `ANTHROPIC_API_KEY`    | Alternative AI provider       |
| `AI_PROVIDER`          | `openai` or `anthropic`       |

### 3. Set up database

```bash
cd server

# Enable pgvector extension in Supabase SQL editor first:
# CREATE EXTENSION IF NOT EXISTS vector;

npx prisma migrate dev --name init
npx prisma generate
```

### 4. Seed the database

```bash
npx prisma db seed
```

This creates:

| Data             | Details                                  |
| ---------------- | ---------------------------------------- |
| Admin user       | `admin@paintedcanyonpastries.com` / `admin123!` |
| Baker user       | `baker@paintedcanyonpastries.com` / `baker123!` |
| Cashier user     | PIN: `9012`                              |
| Demo customer    | `sarah@example.com` / `customer123!`     |
| Products         | 20 products across 7 categories          |
| KB articles      | 12 customer-facing + 10 internal SOPs    |
| Promo codes      | `WELCOME15`, `DESERT10`, `SWEETLOCAL`    |
| Store hours      | Wed–Sun (closed Mon/Tue)                 |
| Timeslots        | 14 days of pickup & delivery slots       |

### 5. Run the app

```bash
# Terminal 1 – Backend (from /server)
cd server
npm run dev

# Terminal 2 – Frontend (from /client)
cd client
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Admin: http://localhost:3000/admin
- POS: http://localhost:3000/pos

---

## Project Structure

```
PAINTED CANYON PASTRIES/
├── client/                      # React frontend
│   ├── public/                  # Static assets & index.html
│   └── src/
│       ├── components/          # Shared components (ProtectedRoute, AIWidget)
│       ├── context/             # React contexts (Auth, Cart, Snackbar)
│       ├── layouts/             # PublicLayout, AdminLayout, POSLayout
│       ├── pages/
│       │   ├── admin/           # 14 admin dashboard pages
│       │   ├── pos/             # POS terminal screen
│       │   └── public/          # 16 public-facing pages
│       ├── theme/               # MUI theme (brand palette & typography)
│       └── App.js               # Root component & routing
│
├── server/                      # Express backend
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (30+ models)
│   │   └── seed.js              # Seed data
│   └── src/
│       ├── ai/                  # AI provider, ingestion, RAG query
│       ├── middleware/          # Auth, error handler, rate limiter
│       ├── routes/              # 18 API route files
│       ├── services/            # Business logic (auth, email)
│       ├── utils/               # PDF generation, audit logging, helpers
│       ├── validators/          # Joi validation schemas
│       ├── app.js               # Express app setup
│       ├── config.js            # Environment config
│       └── index.js             # Server entry point
│
├── .env.example                 # Environment variable template
├── .gitignore
└── package.json                 # Root workspace
```

---

## Key Features

### Public Store
- Browse by category, search, filter by dietary needs
- Product pages with variants, add-ons, allergen badges
- Cart with localStorage persistence
- 4-step checkout with Stripe payments
- Order tracking & history
- Customer accounts with saved addresses

### Admin Dashboard
- Revenue analytics with charts (Recharts)
- Order management with Kanban board (drag status)
- Product CRUD with variants, addons, images, allergens
- Inventory management & purchase orders
- Customer management with order history
- Promo code management
- Knowledge base editor (articles, FAQs, SOPs)
- Scheduling (store hours, timeslots, blackout dates)
- AI assistant management (ingest docs, test queries)

### POS System
- PIN-based staff login
- Product grid with category filters
- Walk-in / Pickup / Delivery toggle
- Cash (change calculator) & card payments
- Receipt printing

### AI Assistant
- RAG-powered chatbot using pgvector embeddings
- Ingests products, KB articles, FAQs, SOPs
- Customer mode (public knowledge) & Admin mode (internal SOPs)
- Citation-backed responses

---

## API Endpoints Overview

| Prefix            | Description                    |
| ----------------- | ------------------------------ |
| `/api/auth`       | Register, login, refresh, me   |
| `/api/products`   | Product CRUD & search          |
| `/api/categories` | Category management            |
| `/api/orders`     | Order CRUD & status workflow   |
| `/api/customers`  | Customer management            |
| `/api/cart`       | Server-side cart (optional)    |
| `/api/timeslots`  | Pickup & delivery scheduling   |
| `/api/promos`     | Promo code validation & CRUD   |
| `/api/inventory`  | Stock & purchase orders        |
| `/api/kb`         | Knowledge base articles        |
| `/api/settings`   | Store settings                 |
| `/api/analytics`  | Dashboard analytics            |
| `/api/ai`         | AI query & ingestion           |
| `/api/upload`     | File/image uploads             |
| `/api/pos`        | POS operations                 |
| `/api/webhook`    | Stripe webhooks                |
| `/api/newsletter` | Newsletter subscriptions       |
| `/api/catering`   | Catering lead forms            |

---

## Brand Design

- **Primary (Sandstone):** `#c4956a`
- **Secondary (Espresso):** `#3e2723`
- **Background (Cream):** `#faf7f2`
- **Accent (Sage):** `#7c8b6f`
- **Fonts:** Playfair Display (headings), Inter (body), DM Sans (buttons)

---

## License

Private — All rights reserved.
