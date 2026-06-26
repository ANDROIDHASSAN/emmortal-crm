// Vercel Cron target — replaces node-cron (serverless has no always-on process).
// Scheduled by vercel.json "crons". Call: /api/cron?job=low-stock | backup | tally
import { connectDB } from './_server/config/db.js';
import { lowStockNotify } from './_server/jobs/lowStock.job.js';
import { runBackup } from './_server/jobs/backup.job.js';
import { runTallySync } from './_server/modules/accounting/accounting.service.js';
import { env } from './_server/config/env.js';

export default async function handler(req, res) {
  // Vercel sets this header on cron invocations; reject anything else.
  const isVercelCron = (req.headers['x-vercel-cron'] || '').length > 0;
  if (!isVercelCron && req.query?.token !== env.ESSL_PUSH_TOKEN) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }
  const job = req.query?.job || 'low-stock';
  try {
    await connectDB();
    if (job === 'backup') await runBackup();
    else if (job === 'tally') await runTallySync({ mode: 'http' });
    else await lowStockNotify();
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, job }));
  } catch (e) {
    console.error('[cron]', job, e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, job, error: e.message }));
  }
}
