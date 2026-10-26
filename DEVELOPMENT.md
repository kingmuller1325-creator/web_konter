# Quick Start Guide for Local Development

## Prerequisites

1. **Node.js 18+** and **pnpm** (already installed)
2. **PostgreSQL 16** - Install locally or use Docker

## Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose -f infra/docker-compose.yml up -d

# Verify containers are running
docker ps
```

## Option B: Local PostgreSQL Installation

1. Download and install PostgreSQL 16 from https://www.postgresql.org/download/
2. Create database and user:
   ```sql
   CREATE DATABASE konteros;
   CREATE USER postgres WITH ENCRYPTED PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE konteros TO postgres;
   ```

## Environment Setup

```bash
# Copy environment files (already done)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Database Initialization

```bash
# Generate Prisma Client
pnpm --filter @konteros/api db:generate

# Run migrations
pnpm --filter @konteros/api db:migrate

# Seed with demo data (admin@konteros.com / admin123, kasir@konteros.com / kasir123)
pnpm --filter @konteros/api db:seed
```

## Development

```bash
# Start both frontend and backend
pnpm dev

# Or separately:
# Terminal 1 - Backend
pnpm --filter @konteros/api dev

# Terminal 2 - Frontend
pnpm --filter @konteros/web dev
```

## Access URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@konteros.com | admin123 |
| Cashier | kasir@konteros.com | kasir123 |

## Default Outlet

- **Outlet**: `default-outlet` (created by seed)
- 7 categories: Pulsa, Paket Data, Listrik, PDAM, Game Voucher, Makanan, Minuman
- 8 sample products (mix of digital and physical)

## Testing Offline Mode

1. Open POS at http://localhost:5173/pos
2. Add items to cart, complete a transaction
3. In DevTools → Application → IndexedDB → konteros-offline → outbox, verify transaction is stored
4. Disconnect network (DevTools → Network → Offline)
5. Make another transaction - should work offline
5. Reconnect network - should auto-sync

## Common Commands

```bash
# Reset database
pnpm --filter @konteros/api db:migrate reset --force
pnpm --filter @konteros/api db:seed

# View database in Prisma Studio
pnpm --filter @konteros/api db:studio

# Lint
pnpm lint

# Type check
pnpm --filter @konteros/api build
pnpm --filter @konteros/web build
```

## Project Structure

```
web_konter/
├── apps/
│   ├── api/          # NestJS 10 + Prisma + PostgreSQL
│   └── web/          # React 18 + Vite + Tailwind + PWA
├── packages/
│   └── shared-types/ # Shared TypeScript types (future)
├── infra/            # Docker, Nginx, scripts
└── .github/workflows/# CI/CD
```

## Next Steps for Production

1. Update `.env` with secure secrets
2. Configure reverse proxy (Nginx + Let's Encrypt)
3. Set up database backups (infra/scripts/backup.sh)
4. Configure CI/CD (GitHub Actions)
5. Set up monitoring/logging