// Vercel serverless entry — wraps the Express app as a single function.
// All /api/* and storefront requests are routed here (see vercel.json).
// The DB connection + app are created once and cached across warm invocations.
import { connectDB } from './_server/config/db.js';
import { createApp } from './_server/app.js';
import { ensureSeedAdmin } from './_server/modules/auth/auth.service.js';

let appPromise;

function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      await connectDB();
      await ensureSeedAdmin().catch((e) => console.error('[seed]', e.message));
      return createApp();
    })();
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('[api] boot failed', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'BOOT_FAILED', message: err.message } }));
  }
}
