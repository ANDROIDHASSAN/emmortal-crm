import cron from 'node-cron';
import { lowStockNotify } from './lowStock.job.js';
import { runBackup } from './backup.job.js';
import { env } from '../config/env.js';
import { runTallySync } from '../modules/accounting/accounting.service.js';

// Asia/Kolkata schedules. Daily low-stock 09:30; monthly backup 1st @ 02:00.
export function registerCronJobs() {
  const tz = 'Asia/Kolkata';
  cron.schedule('30 9 * * *', () => lowStockNotify().catch((e) => console.error('[cron] lowStock', e.message)), { timezone: tz });
  cron.schedule('0 2 1 * *', () => runBackup().catch((e) => console.error('[cron] backup', e.message)), { timezone: tz });

  // Daily Tally pull at 23:00 — only when the live HTTP gateway is configured.
  if (env.TALLY_SYNC_MODE === 'http' && env.TALLY_HTTP_URL) {
    cron.schedule('0 23 * * *', () => runTallySync({ mode: 'http' }).catch((e) => console.error('[cron] tally', e.message)), { timezone: tz });
  }
  console.log(`[cron] jobs registered (low-stock 09:30, backup monthly 02:00${env.TALLY_SYNC_MODE === 'http' && env.TALLY_HTTP_URL ? ', tally 23:00' : ''} IST)`);
}

export default registerCronJobs;
