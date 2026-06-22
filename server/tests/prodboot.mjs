// One-shot production-mode boot check: in-memory Mongo + NODE_ENV=production,
// serves the built SPA at /app and the SEO storefront at /. Exits 0 on success.
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 120000 } });
process.env.MONGODB_URI = mongod.getUri();
process.env.NODE_ENV = 'production';
process.env.PORT = '4099';

const { connectDB } = await import('../src/config/db.js');
await connectDB();
const { ensureSeedAdmin } = await import('../src/modules/auth/auth.service.js');
await ensureSeedAdmin();
const { createApp } = await import('../src/app.js');
const app = createApp();

const server = app.listen(4099);
const base = 'http://127.0.0.1:4099';
const check = async (path, expectFn) => {
  const r = await fetch(base + path);
  const text = await r.text();
  const ok = expectFn(r, text);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${path}  (${r.status})`);
  return ok;
};

let allOk = true;
allOk &= await check('/', (r, t) => r.status === 200 && t.includes('E-mmortal'));
allOk &= await check('/api/v1/health', (r) => r.status === 200);
allOk &= await check('/app', (r, t) => r.status === 200 && t.includes('<div id="root">'));
allOk &= await check('/app/inventory', (r, t) => r.status === 200 && t.includes('<div id="root">')); // SPA fallback
allOk &= await check('/robots.txt', (r, t) => r.status === 200 && t.includes('Sitemap:'));

server.close();
await mongod.stop();
console.log(allOk ? '\nPROD_BOOT_OK' : '\nPROD_BOOT_FAIL');
process.exit(allOk ? 0 : 1);
