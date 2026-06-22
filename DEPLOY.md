# DEPLOY — MilesWeb (cPanel "Setup Node.js App" + Passenger) with MongoDB Atlas

The app runs as **one Passenger Node app** on MilesWeb shared hosting. MongoDB lives on **Atlas**
(MilesWeb shared hosting does not provide MongoDB). If you later move to a MilesWeb **VPS**, only
`MONGODB_URI` changes.

## 1. Provision MongoDB Atlas (free M0)
1. Create a free cluster at https://www.mongodb.com/atlas.
2. Database Access → add a user (username + password).
3. Network Access → add IP `0.0.0.0/0` (or MilesWeb's outbound IP if known).
4. Copy the connection string:
   `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/emmortal_crm?retryWrites=true&w=majority`

## 2. Build the client locally and upload
```bash
npm install
npm run build          # produces client/dist
```
Upload the whole repo (including `client/dist`, `server/`, root `app.js`, `package.json`) to your
cPanel app directory, e.g. `~/emmortal-crm`. You can zip and use cPanel File Manager → Extract.
**Do not upload `node_modules`** — cPanel installs them.

## 3. Create the Node.js app in cPanel
cPanel → **Setup Node.js App** → Create Application:
- **Node.js version:** 18+ (pick the latest available).
- **Application mode:** Production.
- **Application root:** `emmortal-crm` (where you uploaded).
- **Application URL:** your domain (e.g. `emmortal.example.com`).
- **Application startup file:** `app.js` (the Passenger entry at repo root).

Click **Create**. cPanel creates a virtualenv and shows an "Enter to the virtual environment" command.

## 4. Environment variables
In the same screen, add the env vars from `.env.example`:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/emmortal_crm?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<another-long-random-string>
COOKIE_DOMAIN=emmortal.example.com
PUBLIC_BASE_URL=https://emmortal.example.com
SMTP_HOST=smtp.yourmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="E-mmortal <sales@emmortal.example.com>"
LEADS_NOTIFY_EMAIL=owner@emmortal.example.com
BACKUP_NOTIFY_EMAIL=owner@emmortal.example.com
TALLY_SYNC_MODE=import
ESSL_SYNC_MODE=import
```
> Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## 5. Install dependencies
In cPanel click **Run NPM Install** (or, in the virtualenv shell, run `npm install`). Because this is
an npm-workspaces repo, the root install also installs the `server` workspace deps (used at runtime).
The `client` devDeps are only needed for the build you already ran locally.

## 6. Seed (first deploy only)
In the virtualenv shell:
```bash
npm run seed
```
This creates the admin (from `SEED_ADMIN_*`) + demo data. For a clean production start, instead set
`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` and just boot — the admin is auto-seeded on first run.

## 7. Start / Restart
Click **Restart** in cPanel. Verify:
- `https://emmortal.example.com/`            → storefront
- `https://emmortal.example.com/app`         → CRM login
- `https://emmortal.example.com/api/v1/health` → `{ "status": "ok" }`
- `https://emmortal.example.com/sitemap.xml` , `/robots.txt`

## 8. Routing / .htaccess
Passenger handles routing to the Node app automatically for the application URL; no custom `.htaccess`
is required. If you serve from a subfolder and need a rewrite, cPanel generates the Passenger
`.htaccess` for you. Keep the SPA under `/app` (already configured) so it never shadows the SEO pages.

## 9. Monthly backup cron
The app self-schedules a monthly backup (1st, 02:00 IST) that emails a gzipped export to
`BACKUP_NOTIFY_EMAIL`. As a belt-and-braces option you can also add a cPanel **Cron Job**:
```
0 2 1 * *  cd ~/emmortal-crm && ~/nodevenv/emmortal-crm/18/bin/node -e "import('./server/src/jobs/backup.job.js').then(m=>m.runBackup())"
```
(adjust the nodevenv path to the one cPanel created). Admins can also trigger a backup from
**Settings → Run backup now**, or `POST /api/v1/backup/run`.

## 10. Moving to a VPS later
Self-host Mongo on the VPS and change only `MONGODB_URI`. No app code changes.

## Troubleshooting
- **502 / app won't boot:** check the Passenger log (cPanel → app → "Open log"). Usually a missing env
  var or a bad `MONGODB_URI`.
- **Cookies not set:** ensure `COOKIE_DOMAIN` matches your domain and the site is served over HTTPS
  (cookies are `secure` in production).
- **Emails not sending:** confirm SMTP env; with no SMTP the app logs mails instead of sending.
