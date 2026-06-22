import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { ensureSeedAdmin } from './modules/auth/auth.service.js';
import { registerCronJobs } from './jobs/index.js';

async function start() {
  await connectDB();
  await ensureSeedAdmin(); // create admin from env on first boot
  registerCronJobs();

  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] E-mmortal CRM listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[server] API docs: http://localhost:${env.PORT}/api/docs`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start', err);
  process.exit(1);
});

export default start;
