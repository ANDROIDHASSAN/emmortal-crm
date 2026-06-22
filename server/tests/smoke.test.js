import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;
let app;
let agent;

beforeAll(async () => {
  process.env.MONGOMS_LAUNCH_TIMEOUT = '120000';
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 120000 } });
  process.env.MONGODB_URI = mongod.getUri();
  process.env.NODE_ENV = 'test';
  process.env.SEED_ADMIN_EMAIL = 'admin@test.local';
  process.env.SEED_ADMIN_PASSWORD = 'Admin@123';
  const { connectDB } = await import('../src/config/db.js');
  await connectDB(process.env.MONGODB_URI);
  const { ensureSeedAdmin } = await import('../src/modules/auth/auth.service.js');
  await ensureSeedAdmin();
  const { createApp } = await import('../src/app.js');
  app = createApp();
  agent = request.agent(app);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('E-mmortal CRM smoke', () => {
  it('health is ok', async () => {
    const r = await request(app).get('/api/v1/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });

  it('rejects unauthenticated item list', async () => {
    const r = await request(app).get('/api/v1/items');
    expect(r.status).toBe(401);
  });

  it('admin can login', async () => {
    const r = await agent.post('/api/v1/auth/login').send({ email: 'admin@test.local', password: 'Admin@123' });
    expect(r.status).toBe(200);
    expect(r.body.data.role).toBe('admin');
  });

  it('creates an item, stock IN raises qtyOnHand, OUT lowers it', async () => {
    const create = await agent.post('/api/v1/items').send({ name: 'Test Cell', sku: 'T-CELL', category: 'cell', unitPrice: 100, reorderLevel: 5 });
    expect(create.status).toBe(201);
    const id = create.body.data._id || create.body.data.id;

    const inMove = await agent.post('/api/v1/stock-movements').send({ itemId: id, type: 'IN', qty: 10 });
    expect(inMove.status).toBe(201);
    expect(inMove.body.data.item.qtyOnHand).toBe(10);

    const outMove = await agent.post('/api/v1/stock-movements').send({ itemId: id, type: 'OUT', qty: 4 });
    expect(outMove.body.data.item.qtyOnHand).toBe(6);

    const over = await agent.post('/api/v1/stock-movements').send({ itemId: id, type: 'OUT', qty: 999 });
    expect(over.status).toBe(400); // blocked negative

    // qty 6 > reorderLevel 5 → NOT low stock
    const low = await agent.get('/api/v1/items/low-stock');
    expect(low.body.data.some((i) => i.sku === 'T-CELL')).toBe(false);

    // Drop below reorder via OUT, then it should appear in low-stock
    await agent.post('/api/v1/stock-movements').send({ itemId: id, type: 'OUT', qty: 2 }); // → 4
    const low2 = await agent.get('/api/v1/items/low-stock');
    expect(low2.body.data.some((i) => i.sku === 'T-CELL')).toBe(true);
  });

  it('public enquiry creates a website lead', async () => {
    const r = await request(app).post('/api/v1/public/enquiry').send({ name: 'Web Buyer', phone: '900', productInterest: 'EV pack', qty: 2 });
    expect(r.status).toBe(201);
    const leads = await agent.get('/api/v1/leads?source=website');
    expect(leads.body.data.length).toBeGreaterThan(0);
  });

  it('battery gets a unique ID at birth + rework computes loss', async () => {
    const item = await agent.post('/api/v1/items').send({ name: 'BMS X', sku: 'T-BMS', category: 'bms', unitPrice: 500, reorderLevel: 1 });
    const itemId = item.body.data._id || item.body.data.id;
    await agent.post('/api/v1/stock-movements').send({ itemId, type: 'IN', qty: 5 });

    const bat = await agent.post('/api/v1/batteries').send({ spec: { voltage: 48, ah: 30 }, dispatchDate: '2026-01-01' });
    expect(bat.body.data.uniqueId).toMatch(/^EMM-\d{4}-\d{4}$/);

    const rw = await agent.post('/api/v1/rework').send({
      battery: bat.body.data._id,
      returnDate: '2026-02-01',
      repairedDate: '2026-02-05',
      replacedParts: [{ item: itemId, qty: 1, priceAtTime: 500 }],
    });
    expect(rw.status).toBe(201);
    expect(rw.body.data.totalLoss).toBe(500);
    expect(rw.body.data.turnaroundDays).toBe(4);

    const hist = await agent.get(`/api/v1/batteries/${bat.body.data.uniqueId}`);
    expect(hist.body.data.summary.totalLoss).toBe(500);
  });

  it('Tally CSV import creates entries and de-dupes on re-import', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const file = path.resolve('tests/fixtures/tally-sample.csv');
    const buf = fs.readFileSync(file);

    const first = await agent.post('/api/v1/accounting/tally/sync').attach('file', buf, 'tally-sample.csv');
    expect(first.status).toBe(200);
    expect(first.body.data.recordsIn).toBe(5);
    expect(first.body.data.recordsUpserted).toBe(5);

    const before = await agent.get('/api/v1/accounting/entries?limit=100');
    const countBefore = before.body.meta.total;

    // Re-import same file → GUID upsert means no new rows
    await agent.post('/api/v1/accounting/tally/sync').attach('file', buf, 'tally-sample.csv');
    const after = await agent.get('/api/v1/accounting/entries?limit=100');
    expect(after.body.meta.total).toBe(countBefore);
  });

  it('accounting time-machine summary splits GST vs Non-GST', async () => {
    const r = await agent.get('/api/v1/accounting/summary');
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveProperty('difference');
    expect(r.body.data.gstSplit).toHaveProperty('gst');
    expect(r.body.data.gstSplit).toHaveProperty('nonGst');
  });

  it('eSSL import populates attendance + lists unmapped IDs', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    // Create an employee mapped to device id 101
    await agent.post('/api/v1/employees').send({ code: 'E101', name: 'Mapped Worker', esslUserId: '101', monthlySalary: 20000 });
    const buf = fs.readFileSync(path.resolve('tests/fixtures/essl-sample.csv'));
    const r = await agent.post('/api/v1/hr/essl/sync').attach('file', buf, 'essl-sample.csv');
    expect(r.status).toBe(200);
    expect(r.body.data.daysUpserted).toBeGreaterThan(0);
    expect(r.body.data.unmappedUserIds).toContain('999'); // 999 has no employee
  });

  it('RBAC: staff cannot access accounting', async () => {
    const { User } = await import('../src/models/User.js');
    const { hashPassword } = await import('../src/modules/auth/auth.service.js');
    await User.create({ name: 'Staffer', email: 'staff2@test.local', role: 'staff', passwordHash: await hashPassword('Staff@123'), active: true });
    const staffAgent = request.agent(app);
    await staffAgent.post('/api/v1/auth/login').send({ email: 'staff2@test.local', password: 'Staff@123' });
    const r = await staffAgent.get('/api/v1/accounting/entries');
    expect(r.status).toBe(403);
  });

  it('public storefront renders SEO product page + sitemap', async () => {
    await agent.post('/api/v1/products').send({
      name: 'Test 48V Pack', priceFrom: 25000, shortDesc: 'desc',
      specs: { voltage: 48, ah: 30 }, seo: { title: 'Test 48V Pack SEO Title', metaDescription: 'meta desc here' },
    });
    const pdp = await request(app).get('/products/test-48v-pack');
    expect(pdp.status).toBe(200);
    expect(pdp.text).toContain('<title>Test 48V Pack SEO Title</title>');
    expect(pdp.text).toContain('application/ld+json'); // JSON-LD present
    expect(pdp.text).toContain('meta desc here');

    const sitemap = await request(app).get('/sitemap.xml');
    expect(sitemap.status).toBe(200);
    expect(sitemap.text).toContain('/products/test-48v-pack');

    const robots = await request(app).get('/robots.txt');
    expect(robots.text).toContain('Sitemap:');
  });
});
