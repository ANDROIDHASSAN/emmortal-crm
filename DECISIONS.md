# DECISIONS — assumptions made during the build

Per the brief (§0, §17), where the spec was silent I picked a sensible default, recorded it here, and kept moving.

## Architecture
- **Monorepo with npm workspaces** (`server`, `client`). One Express app serves both the public storefront (`/`, EJS-rendered) and the CRM SPA (`/app`, React build) in production → single origin, no CORS in prod.
- **MongoDB Atlas** is the primary DB (free M0). URI is config-driven via `MONGODB_URI`; swap for a MilesWeb VPS Mongo later with zero code change.
- **JavaScript (ESM)** throughout the server (`"type":"module"`). Passenger boots via a CommonJS `app.js` that dynamic-imports the ESM server.

## Auth
- Access JWT (15 min) + refresh JWT (7 d) in **httpOnly cookies** (`emm_at`, `emm_rt`). Refresh rotates `tokenVersion` so a used refresh token can't be replayed.
- Bearer header is also accepted (handy for Swagger / curl).
- Admin is seeded on first boot from `SEED_ADMIN_*` env (idempotent: skipped if any admin exists).

## Money
- Amounts stored as Numbers in **rupees**, always passed through `round2()` (2-dp) before storing totals. Never floats accumulated without rounding.

## Inventory
- `qtyOnHand` is **derived** — only the StockMovement service mutates it. `OUT` is blocked if it would go negative (use `ADJUST` with a signed qty to correct). `REJECT` records a failed-purchase loss and never touches sellable stock.

## Rework
- Battery `uniqueId` format: **`EMM-YYYY-####`**, sequential per calendar year, assigned server-side at creation.
- Replacement parts are priced at **replacement time** (falls back to current item `unitPrice` if not supplied). Each rework auto-creates `OUT` stock movements (rework consumes inventory) and is treated as **100% E-mmortal loss** (free to customer).
- Turnaround = `repairedDate − returnDate` (falls back to `dispatchDate` if no return date).

## Accounting
- **Tally is the source of truth.** Default mode is `import` (upload XML day-book or CSV). Upsert is **idempotent by `tallyGuid`** → re-importing never duplicates. `http` mode (Tally XML/HTTP port) is implemented but requires Tally reachable from the server (documented, off by default).
- Time-machine filters use full **datetime** ranges (`from`/`to` accept `datetime-local`), with GST/Non-GST split + auto summation + difference (`sales − purchase − expense`).
- Party ledger: sales increase receivable (+), purchases/expenses increase payable (−), running balance from `openingBalance`.

## HR / eSSL
- Default mode `import`: parse device export (`.dat`/`.csv`). Per `esslUserId` per day → first punch = in, last = out → `workedMinutes`. Idempotent on `(employee, date)`. **Unmapped device IDs are returned in the response**, never silently dropped.
- `.xlsx` is **not** parsed directly (avoids a heavy dependency on shared hosting) — export the sheet to CSV first. `push` mode (eSSL Push SDK) parser is provided as `parsePushPayload` and documented.

## Storefront / SEO
- Public pages are **server-rendered with EJS** (real HTML + unique `<title>`/meta for crawlers), not the SPA. JSON-LD `Product` schema on PDPs, dynamic `/sitemap.xml` + `/robots.txt`.
- Buy-Now posts to `/api/v1/public/enquiry` (rate-limited + honeypot). Creates a `Lead(source=website)` and emails `LEADS_NOTIFY_EMAIL`.
- **Disclaimer:** on-page SEO is implemented; rankings/traffic are not guaranteed.

## Email
- If `SMTP_HOST` is unset, nodemailer uses a **JSON transport** (logs instead of sends) so the app is fully functional before SMTP is provisioned. Set SMTP env to send for real.

## Cron
- `node-cron`, timezone **Asia/Kolkata**: low-stock check daily 09:30; DB backup monthly (1st, 02:00) → gzipped JSON of all collections emailed to `BACKUP_NOTIFY_EMAIL`. Backup uses a pure-JS logical export (no `mongodump` binary needed on shared hosting).

## Out of scope (per §17)
- Single tenant. Commercial terms ("free changes / 2 months") are not features.
