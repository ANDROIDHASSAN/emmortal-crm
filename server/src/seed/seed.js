import { connectDB, disconnectDB } from '../config/db.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { applyStockMovement } from '../modules/inventory/inventory.service.js';
import { createBattery, createRework } from '../modules/rework/rework.service.js';
import { User, Item, Party, AccountingEntry, ProductionJob, Employee, Attendance, Product, Lead } from '../models/index.js';

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

async function run() {
  await connectDB();
  console.log('[seed] connected');

  // Users
  const userDefs = [
    { name: 'Owner Admin', email: 'admin@emmortal.local', role: 'admin', password: 'Admin@123' },
    { name: 'Factory Manager', email: 'manager@emmortal.local', role: 'manager', password: 'Manager@123' },
    { name: 'Floor Staff', email: 'staff@emmortal.local', role: 'staff', password: 'Staff@123' },
  ];
  const users = {};
  for (const u of userDefs) {
    let user = await User.findOne({ email: u.email });
    if (!user) user = await User.create({ name: u.name, email: u.email, role: u.role, passwordHash: await hashPassword(u.password), active: true });
    users[u.role] = user;
  }
  const admin = users.admin;
  console.log('[seed] users ready');

  // Inventory
  const itemDefs = [
    { name: '18650 Cell 3.7V 3500mAh', category: 'cell', sku: 'CELL-18650', unitPrice: 95, reorderLevel: 500, supplierName: 'Pune Power', open: 1800 },
    { name: 'LiFePO4 Cell 3.2V 100Ah', category: 'cell', sku: 'CELL-LFP-100', unitPrice: 1450, reorderLevel: 100, supplierName: 'Nashik Cells', open: 60 },
    { name: 'NMC Cell 50Ah', category: 'cell', sku: 'CELL-NMC-50', unitPrice: 980, reorderLevel: 80, supplierName: 'Pune Power', open: 40 },
    { name: 'BMS 4S 30A', category: 'bms', sku: 'BMS-4S-30A', unitPrice: 650, reorderLevel: 50, supplierName: 'BMS Tech India', open: 30 },
    { name: 'BMS 16S 60A', category: 'bms', sku: 'BMS-16S-60A', unitPrice: 2200, reorderLevel: 20, supplierName: 'BMS Tech India', open: 18 },
    { name: 'Aluminium Casing M', category: 'casing', sku: 'CASE-AL-M', unitPrice: 350, reorderLevel: 40, supplierName: 'Metalcraft', open: 120 },
    { name: 'Nickel Strip 0.2mm', category: 'consumable', sku: 'CONS-NICKEL', unitPrice: 1200, reorderLevel: 10, supplierName: 'PackSupplies', open: 25 },
    { name: 'Silicone Wire 10AWG', category: 'consumable', sku: 'CONS-WIRE10', unitPrice: 45, reorderLevel: 100, supplierName: 'PackSupplies', open: 300 },
    { name: 'XT60 Connector', category: 'consumable', sku: 'CONS-XT60', unitPrice: 35, reorderLevel: 80, supplierName: 'PackSupplies', open: 60 },
  ];
  const items = {};
  for (const d of itemDefs) {
    let item = await Item.findOne({ sku: d.sku });
    if (!item) {
      item = await Item.create({ name: d.name, category: d.category, sku: d.sku, unitPrice: d.unitPrice, reorderLevel: d.reorderLevel, supplierName: d.supplierName, qtyOnHand: 0 });
      await applyStockMovement({ itemId: item._id, type: 'IN', qty: d.open, unitPriceAtTime: d.unitPrice, reference: 'Opening stock', occurredAt: daysAgo(40), createdBy: admin._id });
    }
    items[d.sku] = item;
  }
  // Rejections
  await applyStockMovement({ itemId: items['CELL-NMC-50']._id, type: 'REJECT', qty: 6, unitPriceAtTime: 980, supplierName: 'Pune Power', reason: 'Failed capacity test', occurredAt: daysAgo(20), createdBy: admin._id });
  await applyStockMovement({ itemId: items['BMS-4S-30A']._id, type: 'REJECT', qty: 3, unitPriceAtTime: 650, supplierName: 'BMS Tech India', reason: 'DOA', occurredAt: daysAgo(12), createdBy: admin._id });
  console.log('[seed] inventory ready');

  // Parties
  const partyDefs = [
    { name: 'GreenRide EV Pvt Ltd', type: 'debtor', gstin: '27ABCDE1234F1Z5', phone: '9876500001', openingBalance: 15000 },
    { name: 'SolarMax Energy', type: 'debtor', gstin: '27FGHIJ5678K2Z9', phone: '9876500002', openingBalance: 0 },
    { name: 'Pune Power', type: 'creditor', phone: '9876500010', openingBalance: -8000 },
    { name: 'BMS Tech India', type: 'creditor', phone: '9876500011' },
  ];
  const parties = {};
  for (const p of partyDefs) { let party = await Party.findOne({ name: p.name }); if (!party) party = await Party.create(p); parties[p.name] = party; }
  console.log('[seed] parties ready');

  // Batteries + reworks
  if ((await Battery0Count()) === 0) {
    const b1 = await createBattery({ spec: { cell: 'LiFePO4', bms: '16S 60A', voltage: 48, ah: 30, qty: 1 }, customer: parties['GreenRide EV Pvt Ltd']._id, dispatchDate: daysAgo(60) }, { id: admin._id });
    const b2 = await createBattery({ spec: { cell: 'NMC', bms: '13S 40A', voltage: 48, ah: 26, qty: 1 }, customer: parties['SolarMax Energy']._id, dispatchDate: daysAgo(45) }, { id: admin._id });
    const b3 = await createBattery({ spec: { cell: '18650', bms: '4S 30A', voltage: 12, ah: 100, qty: 1 }, customer: parties['GreenRide EV Pvt Ltd']._id, dispatchDate: daysAgo(30) }, { id: admin._id });
    await createRework({ battery: b1._id, returnDate: daysAgo(30), repairedDate: daysAgo(26), problem: 'BMS failure', technician: 'Imran', replacedParts: [{ item: items['BMS-16S-60A']._id, qty: 1, priceAtTime: 2200 }, { item: items['CONS-NICKEL']._id, qty: 0.5, priceAtTime: 1200 }], notes: 'BMS replaced' }, { id: admin._id });
    await createRework({ battery: b2._id, returnDate: daysAgo(18), repairedDate: daysAgo(12), problem: 'Cell imbalance', technician: 'Imran', replacedParts: [{ item: items['CELL-LFP-100']._id, qty: 2, priceAtTime: 1450 }] }, { id: admin._id });
    await createRework({ battery: b3._id, returnDate: daysAgo(8), repairedDate: daysAgo(3), problem: 'Connector burnt', technician: 'Sana', replacedParts: [{ item: items['CONS-WIRE10']._id, qty: 3, priceAtTime: 45 }, { item: items['CONS-XT60']._id, qty: 1, priceAtTime: 35 }] }, { id: admin._id });
  }
  console.log('[seed] batteries + reworks ready');

  // Accounting
  if ((await AccountingEntry.countDocuments()) === 0) {
    await AccountingEntry.insertMany([
      { kind: 'sales', gst: true, amount: 70000, taxAmount: 12600, party: parties['GreenRide EV Pvt Ltd']._id, voucherNo: 'S-001', occurredAt: daysAgo(10), source: 'manual' },
      { kind: 'sales', gst: false, amount: 18000, taxAmount: 0, party: parties['SolarMax Energy']._id, voucherNo: 'S-002', occurredAt: daysAgo(6), source: 'manual' },
      { kind: 'purchase', gst: true, amount: 40000, taxAmount: 7200, party: parties['Pune Power']._id, voucherNo: 'P-001', occurredAt: daysAgo(15), source: 'manual' },
      { kind: 'expense', gst: false, amount: 5500, taxAmount: 0, voucherNo: 'E-001', narration: 'Electricity', occurredAt: daysAgo(4), source: 'manual' },
    ]);
  }
  console.log('[seed] accounting ready');

  // Production (last 5 days)
  if ((await ProductionJob.countDocuments()) === 0) {
    for (let d = 0; d < 5; d++) {
      for (let j = 0; j < 2; j++) {
        await ProductionJob.create({ productionDate: daysAgo(d), title: `${[48, 60, 72][(d + j) % 3]}V Pack`, voltage: [48, 60, 72][(d + j) % 3], ah: [30, 40, 50][(d + j) % 3], qty: 1 + ((d + j) % 4), status: 'on', progress: ['pending', 'in_progress', 'done'][(d + j) % 3], createdBy: admin._id });
      }
    }
  }
  console.log('[seed] production ready');

  // Employees + attendance
  const empDefs = [
    { code: 'E001', name: 'Imran Shaikh', designation: 'Pack Technician', monthlySalary: 22000, esslUserId: '101' },
    { code: 'E002', name: 'Sana Patil', designation: 'QC', monthlySalary: 24000, esslUserId: '102' },
    { code: 'E003', name: 'Rahul More', designation: 'Assembly', monthlySalary: 18000, esslUserId: '103' },
  ];
  for (const e of empDefs) {
    let emp = await Employee.findOne({ code: e.code });
    if (!emp) {
      emp = await Employee.create(e);
      for (let d = 1; d <= 5; d++) {
        const day = daysAgo(d); const dayUtc = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
        const inT = new Date(dayUtc); inT.setUTCHours(9, 30); const outT = new Date(dayUtc); outT.setUTCHours(18, 0);
        await Attendance.create({ employee: emp._id, date: dayUtc, inTime: inT, outTime: outT, workedMinutes: 510, source: 'essl' });
      }
    }
  }
  console.log('[seed] HR ready');

  // Products (storefront)
  const prodDefs = [
    { name: '48V 30Ah EV Battery Pack', slug: '48v-30ah-ev-battery-pack', shortDesc: 'High-density LiFePO4 traction pack for e-bikes & e-rickshaws.', priceFrom: 28000, featured: true, specs: { cell: 'LiFePO4', bms: '16S 60A', voltage: 48, ah: 30 }, seo: { title: '48V 30Ah EV Battery Pack — E-mmortal', metaDescription: 'Custom 48V 30Ah LiFePO4 EV battery pack built to order.', keywords: ['48v battery', 'ev battery pack', 'lifepo4'] } },
    { name: '12V 100Ah LiFePO4 Battery', slug: '12v-100ah-lifepo4-battery', shortDesc: 'Deep-cycle LiFePO4 for solar, inverter and backup.', priceFrom: 32000, featured: true, specs: { cell: 'LiFePO4', bms: '4S 100A', voltage: 12, ah: 100 }, seo: { title: '12V 100Ah LiFePO4 Battery — E-mmortal', metaDescription: 'Deep-cycle 12V 100Ah LiFePO4 battery for solar & backup.', keywords: ['12v lifepo4', 'solar battery'] } },
    { name: '72V 50Ah High-Range EV Pack', slug: '72v-50ah-high-range-ev-pack', shortDesc: 'Long-range traction pack for L5 vehicles.', priceFrom: 68000, featured: false, specs: { cell: 'NMC', bms: '20S 80A', voltage: 72, ah: 50 }, seo: { title: '72V 50Ah EV Battery Pack — E-mmortal', metaDescription: 'High-range 72V 50Ah NMC EV battery pack.', keywords: ['72v battery', 'high range ev'] } },
  ];
  for (const p of prodDefs) { if (!(await Product.findOne({ slug: p.slug }))) await Product.create({ ...p, active: true }); }
  console.log('[seed] products ready');

  // Leads
  if ((await Lead.countDocuments()) === 0) {
    const sources = ['website', 'manual', 'csv', 'reference', 'whatsapp'];
    const statuses = ['new', 'contacted', 'quotation', 'negotiation', 'won', 'lost'];
    const leads = [];
    for (let i = 0; i < 12; i++) leads.push({ name: `Lead ${i + 1}`, phone: `98765${String(10000 + i)}`, email: `lead${i}@example.com`, productInterest: prodDefs[i % prodDefs.length].name, qty: 1 + (i % 5), value: 20000 + i * 5000, source: sources[i % sources.length], status: statuses[i % statuses.length], boardOrder: i, owner: users.manager._id, history: [{ from: null, to: statuses[i % statuses.length], at: daysAgo(15 - i) }] });
    await Lead.insertMany(leads);
  }
  console.log('[seed] leads ready');

  console.log('\n[seed] DONE ✅');
  console.log('Logins: admin@emmortal.local / Admin@123 | manager@emmortal.local / Manager@123 | staff@emmortal.local / Staff@123');
  await disconnectDB();
  process.exit(0);
}

// helper (declared after use via hoisting-safe function)
async function Battery0Count() { const { Battery } = await import('../models/Battery.js'); return Battery.countDocuments(); }

run().catch((err) => { console.error('[seed] failed', err); process.exit(1); });
