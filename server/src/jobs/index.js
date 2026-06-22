import cron from 'node-cron';
import { env } from '../config/env.js';
import { lowStockNotify } from './lowStock.job.js';
import { runBackup } from './backup.job.js';

// Register scheduled jobs. Timezone: Asia/Kolkata.
export function registerCronJobs() {
  if (env.NODE_ENV === 'test') return;
  const tz = 'Asia/Kolkata';

  // Daily low-stock check at 09:30 IST.
  cron.schedule(
    '30 9 * * *',
    () => {
      lowStockNotify().catch((e) => console.error('[cron:lowStock]', e.message));
    },
    { timezone: tz }
  );

  // Monthly backup on the 1st at 02:00 IST → email to BACKUP_NOTIFY_EMAIL.
  cron.schedule(
    '0 2 1 * *',
    () => {
      runBackup().catch((e) => console.error('[cron:backup]', e.message));
    },
    { timezone: tz }
  );

  // eslint-disable-next-line no-console
  console.log('[cron] jobs registered (low-stock daily, backup monthly)');
}

export default registerCronJobs;
