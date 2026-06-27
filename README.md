# E-mmortal Operations CRM + Storefront

A single-tenant operations CRM for **E-mmortal Automotives Pvt. Ltd.** (a lithium battery
manufacturer in MIDC Ambad, Nashik) bundled with a public, SEO-friendly product website.

It is one connected system — data flows in a single loop:

```
Website / SEO  →  Leads  →  Production  →  Battery IDs  →  Rework  →  Inventory  →  Accounting (Tally)  →  HR (eSSL)
```

---

## 1. New here? Read this first

The whole app lives in **one folder, one package** (no separate `client/` and `server/`):

```
emmortal-crm/
├── index.html              # Vite HTML entry for the React app
├── vite.config.js          # Frontend build config (outputs to dist/app)
├── tailwind.config.js      # Design tokens (colours, fonts, shadows)
├── vercel.json             # Single Vercel deploy: static SPA + serverless API + cron
│
├── src/                    # ── FRONTEND (React + Vite) ──
│   ├── main.jsx            #   App bootstrap (Redux + Router)
│   ├── routes.jsx          #   All routes in one place
│   ├── index.css           #   Tailwind layers + reusable component classes
│   ├── app/store.js        #   Redux store
│   ├── api/apiSlice.js     #   RTK Query base (all data fetching builds on this)
│   ├── features/<name>/    #   One folder per domain: its RTK Query endpoints + slice
│   ├── pages/              #   One file per screen (Dashboard, Inventory, …)
│   ├── components/         #   Shared UI (Layout, DataTable, Modal, StatCard, …)
│   └── lib/                #   Small helpers (formatting, config)
│
└── api/                    # ── BACKEND (Express, runs as a Vercel function) ──
    ├── index.js            #   Serverless entry — wraps the Express app
    ├── cron.js             #   Scheduled jobs entry (Vercel Cron)
    └── _server/            #   The Express app itself (the `_` hides it from Vercel routing)
        ├── app.js          #   Express app: middleware, routes, static SPA, storefront
        ├── server.js       #   Local/Render entry (app.listen) — not used on Vercel
        ├── config/         #   env + database connection
        ├── routes/api.js   #   Mounts every module's routes under /api/v1
        ├── modules/<name>/ #   One folder per domain: routes → controller → service
        ├── models/         #   Mongoose schemas
        ├── middleware/     #   auth, rbac, validation, uploads, error handling
        ├── jobs/           #   low-stock alert, monthly backup, Tally sync
        ├── public-site/    #   EJS storefront (home, catalogue, product) + SEO
        └── seed/           #   Demo-data seeder
```

**Mental model:** a request to `/api/v1/...` is handled by Express in `api/`. Everything else
(`/`, `/app/...`) is the website or the React app. The React app calls the API through RTK
Query (`src/features/*`), which all derives from one base in `src/api/apiSlice.js`.

**Where do I add a feature?** Backend: add a `module` (route → controller → service) and a
`model`. Frontend: add a `feature` (RTK Query endpoints) and a `page`, then a route in
`src/routes.jsx` and a nav entry in `src/components/Layout.jsx`.

---

## 2. Tech stack

| Layer | Tech |
|---|---|
| **Frontend** | React 18 (Vite), React Router, Redux Toolkit + RTK Query, TailwindCSS, Recharts, @hello-pangea/dnd |
| **Backend** | Node.js + Express (REST), MongoDB + Mongoose, JWT (httpOnly cookies) + bcrypt, Zod validation |
| **Storefront** | Server-rendered EJS with SEO (meta, OpenGraph, JSON-LD, sitemap.xml, robots.txt) |
| **Ops** | node-cron (local/Render) or Vercel Cron, Nodemailer, Multer + papaparse, helmet, rate-limiting |

---

## 3. Modules

1. **Inventory** — items, inward/outward movements (atomic stock), rejections, low-stock alerts.
2. **Rework** — unique battery ID `EMM-YYYY-####`, one-ID history + QR, loss by day/week/month, aging.
3. **Accounting** — GST / non-GST books, Tally (live HTTP gateway + upload fallback), date filters, ledgers, CSV export.
4. **Production** — daily board (V/Ah/Qty, on/off + progress, comments); completing a job auto-generates battery IDs.
5. **HR** — eSSL biometric (file import + push webhook), employee master, attendance, payroll with absent/short-hour flags.
6. **Website + SEO + Leads** — catalogue, Buy-Now → email + lead, Kanban + List board, CSV import; a Won lead spawns a production order.

### Cross-module automation
- Website Buy-Now → creates a **Lead** + email + in-app notification.
- Lead marked **Won** → auto-creates a **Production order**.
- Production order **completed** → auto-generates unique **Battery IDs** (status: dispatched).
- Battery **returned** → Rework → **deducts parts from Inventory** and records the loss.
- Stock at/below reorder level → **low-stock notification** (bell).

---

## 4. Local development

```bash
cp .env.example .env     # fill MONGODB_URI + JWT secrets (see below)
npm install              # one install for the whole app
npm run seed             # create the admin + demo data in every module

# Two terminals (hot reload):
npm run dev              # Vite frontend on http://localhost:5173/app
npm run dev:api          # Express API on http://localhost:3000 (Vite proxies /api to it)

# OR single process (build once, serve everything on :3000):
npm run build            # builds the React app into dist/app
npm start                # Express serves the API + storefront + SPA at /app
```

Seeded logins: `admin@emmortal.local / Admin@123` · `manager@… / Manager@123` · `staff@… / Staff@123`.

### Required environment variables
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas SRV or local). URL-encode the password. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Long random strings used to sign auth tokens. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | The first admin account, created on first boot. |

Optional: `SMTP_*` (email), `TALLY_HTTP_URL` (live Tally), `ESSL_PUSH_TOKEN` (biometric push), `CLIENT_ORIGIN` (extra CORS origins for a split deploy).

---

## 5. Deploy — single Vercel project

The whole app deploys as **one Vercel project** (`vercel.json` is included):
the React app is served as static files at `/app`, the Express API runs as a serverless
function, and the cron jobs run via Vercel Cron.

1. **MongoDB Atlas** → create a cluster + DB user; under **Network Access** allow `0.0.0.0/0`
   (Vercel's IPs are dynamic). Copy the SRV string (URL-encoded password) → `MONGODB_URI`.
2. **Vercel** → New Project → import the repo → **Root Directory = `./`**, Framework = **Other**.
3. Add Environment Variables: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `SEED_ADMIN_PASSWORD` (Production scope), then **Deploy**.
4. URLs: CRM → `https://<project>.vercel.app/app/login` · API → `…/api/v1/health` · Storefront → `…/`.

> A `render.yaml` is also included if you prefer a single always-on Render web service
> (`npm install && npm run build` → `npm start`), which keeps `node-cron` running in-process.

---

## 6. Integrations

- **Tally** — enable the HTTP-XML gateway (Gateway of Tally → F1 → Advanced Config), set
  `TALLY_HTTP_URL=http://<tally-host>:9000` and `TALLY_SYNC_MODE=http`. A daily cron pulls the
  Day Book; you can also click **Sync from Tally (live)** or upload a CSV/XML export anytime.
- **eSSL** — upload the eTimeTrackLite export (.dat/.csv), or point the device Push SDK at
  `POST /api/v1/hr/essl-push` with header `x-essl-token: <ESSL_PUSH_TOKEN>`.

## 7. Backups
A monthly cron dumps the DB to gzipped JSON and emails it to `BACKUP_NOTIFY_EMAIL`.
Admins can also trigger one from **Settings → Run backup now**.

## 8. Security
httpOnly JWT cookies, bcrypt password hashing, helmet headers, same-origin/allow-listed CORS,
rate-limiting on auth and the public Buy-Now form, Zod validation on every endpoint, and a
honeypot field on the enquiry form.
