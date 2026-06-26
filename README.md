# E-mmortal Operations CRM + Storefront

A single-tenant Operations CRM for **E-mmortal Automotives Pvt. Ltd.** (lithium battery
manufacturer, MIDC Ambad, Nashik) plus a public product website. One connected system:

**Website/SEO → Leads → Production → Battery IDs → Rework → Inventory → Accounting (Tally) → HR (eSSL).**

## Stack
- **Backend:** Node.js + Express (REST), MongoDB + Mongoose, JWT (httpOnly cookies) + bcrypt, Zod validation, Multer + papaparse, node-cron, Nodemailer, helmet, rate-limiting.
- **Frontend:** React (Vite) + React Router + TailwindCSS + Redux Toolkit (RTK Query) + Recharts + @hello-pangea/dnd.
- **Storefront:** server-rendered EJS with SEO (meta, OG, JSON-LD, sitemap.xml, robots.txt).

## Modules
1. **Inventory** — items, inward/outward movements (atomic stock), rejections, low-stock alerts.
2. **Rework** — unique battery ID `EMM-YYYY-####`, one-ID history + QR, loss (day/week/month), aging.
3. **Accounting** — GST/non-GST, Tally **live HTTP gateway + upload fallback**, time-machine filters, ledgers, CSV export.
4. **Production** — daily board, V/Ah/Qty, On/Off + completion, comments; completing a job auto-generates battery IDs.
5. **HR** — eSSL **file import + push webhook**, employee master, attendance, payroll with absent/short-hours flags.
6. **Website + SEO + Leads** — catalogue, Buy-Now → email + Lead, Kanban + List, CSV import; Won lead spawns a Production Order.

## Cross-module automation
- Website Buy-Now → creates **Lead** + email + in-app notification.
- Lead → **Won** → auto-creates a **Production Order**.
- Production Order → **Completed** → auto-generates unique **Battery IDs** (dispatched).
- Battery **return** → Rework → **deducts parts from Inventory** + records loss.
- Stock drops to reorder level → **low-stock notification** (bell).

## Local setup
```bash
cp .env.example .env          # fill MONGODB_URI, JWT secrets, SMTP, etc.
npm install                   # installs server + client (workspaces)
npm run seed                  # creates admin + demo data in every module
npm run dev                   # server :3000 + Vite client :5173/app  (hot reload)
# OR single-origin (website + CRM together on :3000):
npm run build                 # builds the React app into client/dist
npm start                     # Express serves API + storefront + SPA at /app
```
Seeded logins: `admin@emmortal.local / Admin@123` · `manager@… / Manager@123` · `staff@… / Staff@123`.
The website's **CRM Login** button opens `/app/login`.

## Deploy: Vercel (frontend) + Render (backend) + MongoDB Atlas
The frontend (React) and backend (Express + website) run on **different domains**, so the
login cookie is cross-site — the code already handles this (`SameSite=None; Secure` cookies +
CORS from `CLIENT_ORIGIN`). Push this repo to GitHub first; both hosts deploy from GitHub.

### 0. MongoDB Atlas
- Create a cluster, a DB user, and under **Network Access** allow `0.0.0.0/0` (Render's IPs are dynamic).
- Copy the SRV connection string (URL-encode the password). This is `MONGODB_URI`.

### 1. Backend → Render
- **New → Web Service** → connect the repo (a `render.yaml` blueprint is included).
- Build: `npm install` · Start: `npm start` · Health check: `/api/v1/health`.
- Set env vars (dashboard): `NODE_ENV=production`, `MONGODB_URI`, `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `PUBLIC_BASE_URL` (the Render URL), plus SMTP/Tally/eSSL as needed.
  Leave `CLIENT_ORIGIN` / `CRM_URL` for now — you'll add them after Vercel gives you a URL.
- Deploy → note the URL, e.g. `https://emmortal-crm-api.onrender.com`.
- First boot auto-seeds the admin (`SEED_ADMIN_EMAIL`/`PASSWORD`). Run `npm run seed` once
  (Render Shell) if you want full demo data.

### 2. Frontend → Vercel
- **New Project** → import the repo → set **Root Directory = `client`** (a `vercel.json` is included).
- Add Environment Variables:
  - `VITE_API_URL = https://emmortal-crm-api.onrender.com/api/v1`  (your Render URL + `/api/v1`)
  - `VITE_BASE_PATH = /`
  - `VITE_SITE_URL = https://emmortal-crm-api.onrender.com`  (Render also hosts the storefront)
- Deploy → note the URL, e.g. `https://emmortal.vercel.app`.

### 3. Connect the two (back on Render)
- Set `CLIENT_ORIGIN = https://emmortal.vercel.app` (CORS allow-list; comma-separate for multiple).
- Set `CRM_URL = https://emmortal.vercel.app/login` (the website's "CRM Login" button target).
- Redeploy the Render service. Done — open the Vercel URL and log in.

> **Cross-site cookie note:** Chrome/Edge/Firefox work out of the box. Safari's tracking
> protection can block third-party cookies. For bullet-proof production, put both on one parent
> domain (e.g. `app.emmortal.com` → Vercel, `api.emmortal.com` → Render) so cookies are first-party.

---

## Deploy on MilesWeb (single-origin Node VPS — alternative)
1. **Node + MongoDB** — use MongoDB Atlas (recommended) or a server-hosted Mongo; put the URI in `.env`.
2. **Upload** the repo (git or SFTP). Run `npm install` then `npm run build`.
3. **Process manager (PM2):**
   ```bash
   npm i -g pm2
   NODE_ENV=production pm2 start server/src/server.js --name emmortal-crm
   pm2 save && pm2 startup        # restart on reboot
   ```
4. **Reverse proxy (Nginx)** — point your domain at the Node port (3000):
   ```nginx
   server {
     server_name emmortalautomotives.com;
     location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
   }
   ```
   (On MilesWeb cPanel "Setup Node.js App", set the startup file to `server/src/server.js`, app mode Production, and add the env vars in the UI.) Then add SSL via Let's Encrypt.
5. **SEO** — after go-live, submit `https://yourdomain.com/sitemap.xml` in **Google Search Console**.

## Integrations
- **Tally:** enable the HTTP-XML gateway (Gateway of Tally → F1 → Advanced Config → Tally.NET/HTTP on a port), set `TALLY_HTTP_URL=http://<tally-host>:9000` and `TALLY_SYNC_MODE=http`. A daily 23:00 IST cron pulls the Day Book; you can also click **Sync from Tally (live)**, or upload a CSV/XML export anytime.
- **eSSL:** upload the eTimeTrackLite export (.dat/.csv), or configure the device Push SDK to POST to `/api/v1/hr/essl-push` with header `x-essl-token: <ESSL_PUSH_TOKEN>`.

## Backups
A node-cron job on the 1st of each month (02:00 IST) dumps the DB to gzipped JSON and emails it to `BACKUP_NOTIFY_EMAIL`. Admins can also trigger one from **Settings → Run backup now**.

## Security
httpOnly JWT cookies, bcrypt, helmet, CORS locked to the app origin, rate-limiting on auth + the public Buy-Now form, Zod validation on every endpoint, honeypot on the enquiry form.
