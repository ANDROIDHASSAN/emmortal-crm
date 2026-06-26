import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { ensureSeedAdmin } from './modules/auth/auth.service.js';
import { registerCronJobs } from './jobs/index.js';

async function start() {
  await connectDB();
  await ensureSeedAdmin();
  registerCronJobs();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[server] E-mmortal CRM listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

start().catch((err) => { console.error('[server] failed to start', err); process.exit(1); });

export default start;
