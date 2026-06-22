# E-mmortal Operations CRM + Storefront

Production CRM for **E-mmortal Automotives Pvt. Ltd.** (Nashik) — custom lithium battery packs.
One connected loop: **Website · SEO → Leads → Inventory → Production → Dispatch → Rework → Accounting · Tally → HR · eSSL**.

- **Backend:** Node + Express (ESM), REST under `/api/v1`, MongoDB + Mongoose, JWT (httpOnly cookies), Zod validation, Swagger.
- **Frontend:** React 18 + Vite, Redux Toolkit + RTK Query, React Router v6, Tailwind, Recharts, dnd Kanban.
- **Public storefront:** server-rendered (EJS) + SEO (sitemap, robots, JSON-LD) + Buy-Now → Lead + email.
- **Integrations:** Tally (import XML/CSV, or HTTP) and eSSL biometric (import .dat/.csv) via an adapter pattern with import fallback.

## Prerequisites
- Node.js 18+ (tested on Node 22).
- A MongoDB connection string (MongoDB Atlas free tier recommended). Local Mongo works too.

## Quick start
```bash
npm install                 # installs server + client workspaces
cp .env.example .env        # then fill MONGODB_URI (+ optional SMTP)
npm run seed                # idempotent seed; add -- --clear to wipe & reseed
npm run dev                 # server :3000 + client :5173 (Vite proxies /api → :3000)
```
- CRM (dev): http://localhost:5173/app
- CRM (prod build): http://localhost:3000/app
- Public storefront: http://localhost:3000/
- API docs (Swagger): http://localhost:3000/api/docs

### Seeded logins
| Role    | Email                     | Password     |
|---------|---------------------------|--------------|
| admin   | admin@emmortal.local      | Admin@123    |
| manager | manager@emmortal.local    | Manager@123  |
| staff   | staff@emmortal.local      | Staff@123    |

## Scripts
| Command | What it does |
|---------|--------------|
| `npm run dev` | Run server + client concurrently (dev) |
| `npm run build` | Build the React client to `client/dist` |
| `npm start` | Run the Express server (serves SPA + public site in prod) |
| `npm run seed` | Seed realistic data (`-- --clear` to reset) |
| `npm test` | Run the API test suite (vitest + supertest, in-memory Mongo) |

## Production (single origin)
```bash
npm run build               # client/dist
NODE_ENV=production npm start
```
Express serves the public storefront at `/`, the SPA at `/app`, and the API at `/api/v1` — one origin, no CORS.

## Modules
1. **Inventory** — items, stock movements (IN/OUT/REJECT/ADJUST), rejection loss, low-stock alerts, summary.
2. **Rework** — battery unique ID at birth, one-ID full history, replacement-time pricing, auto inventory consumption, loss & aging reports.
3. **Production** — a daily board; per-job V/Ah/Qty, on/off, progress, comments, history.
4. **Accounting** — GST & Non-GST, time-machine datetime filters, summation + difference, party ledgers, Tally sync (import/http).
5. **HR** — employee master, eSSL biometric import, attendance, monthly payroll.
6. **Website + Leads** — SEO storefront, Buy-Now → Lead + email, Kanban + List, sources, CSV import, status history.
- **Foundation** — RBAC login, monthly DB backup email, audit log, dashboards.

## Importing Tally / eSSL
Sample files live in `server/tests/fixtures/`:
- Accounting → Tally tab → upload `tally-sample.csv` (re-upload to prove de-dup).
- HR → Attendance tab → upload `essl-sample.csv` (user `999` shows up as unmapped).

See `DEPLOY.md` for MilesWeb cPanel + Atlas deployment, and `DECISIONS.md` for assumptions.
