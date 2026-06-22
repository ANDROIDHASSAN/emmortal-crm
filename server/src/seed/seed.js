import { connectDB, disconnectDB } from '../config/db.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { applyStockMovement } from '../modules/inventory/inventory.service.js';
import { createBattery, createRework } from '../modules/rework/rework.service.js';
import {
  User, Item, Party, AccountingEntry, ProductionJob, Employee, Attendance, Product, Lead,
} from '../models/index.js';
import { StockMovement } from '../models/StockMovement.js';
import { Battery } from '../models/Battery.js';
import { Rework } from '../models/Rework.js';

const CLEAR = process.argv.includes('--clear') || process.env.SEED_CLEAR === 'true';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function atHour(date, h, m = 0) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

async function run() {
  await connectDB();
  console.log(`[seed] connected. clear=${CLEAR}`);

  if (CLEAR) {
    await Promise.all([
      User.deleteMany({}), Item.deleteMany({}), StockMovement.deleteMany({}),
      Party.deleteMany({}), Battery.deleteMany({}), Rework.deleteMany({}),
      AccountingEntry.deleteMany({}), ProductionJob.deleteMany({}), Employee.deleteMany({}),
      Attendance.deleteMany({}), Product.deleteMany({}), Lead.deleteMany({}),
    ]);
    console.log('[seed] cleared collections');
  }

  // --- Users ---
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
  console.log('[seed] users ready (admin/manager/staff)');

  // --- Inventory items (some below reorder level) ---
  const itemDefs = [
    { name: 'LiFePO4 Cell 3.2V 100Ah', category: 'cell', sku: 'CELL-LFP-100', unit: 'pcs', unitPrice: 1450, reorderLevel: 40, supplierName: 'Nashik Cells Co', open: 120 },
    { name: 'NMC Cell 3.7V 50Ah', category: 'cell', sku: 'CELL-NMC-50', unit: 'pcs', unitPrice: 980, reorderLevel: 50, supplierName: 'Pune Power', open: 30 },
    { name: '18650 Cell 3.7V 3500mAh', category: 'cell', sku: 'CELL-18650', unit: 'pcs', unitPrice: 95, reorderLevel: 500, supplierName: 'Pune Power', open: 1800 },
    { name: 'Smart BMS 16S 48V 60A', category: 'bms', sku: 'BMS-16S-60A', unit: 'pcs', unitPrice: 2200, reorderLevel: 15, supplierName: 'BMS Tech India', open: 8 },
    { name: 'BMS 4S 12V 30A', category: 'bms', sku: 'BMS-4S-30A', unit: 'pcs', unitPrice: 650, reorderLevel: 20, supplierName: 'BMS Tech India', open: 60 },
    { name: 'BMS 13S 48V 40A', category: 'bms', sku: 'BMS-13S-40A', unit: 'pcs', unitPrice: 1800, reorderLevel: 10, supplierName: 'BMS Tech India', open: 5 },
    { name: 'Aluminium Casing 48V Pack', category: 'casing', sku: 'CASE-48V', unit: 'pcs', unitPrice: 750, reorderLevel: 20, supplierName: 'MetalWorks', open: 35 },
    { name: 'ABS Casing 12V Pack', category: 'casing', sku: 'CASE-12V', unit: 'pcs', unitPrice: 280, reorderLevel: 30, supplierName: 'MetalWorks', open: 18 },
    { name: 'Nickel Strip 0.2mm (kg)', category: 'consumable', sku: 'CONS-NICKEL', unit: 'kg', unitPrice: 1200, reorderLevel: 5, supplierName: 'MetalWorks', open: 12 },
    { name: 'Heat Shrink Sleeve (m)', category: 'consumable', sku: 'CONS-SHRINK', unit: 'm', unitPrice: 18, reorderLevel: 100, supplierName: 'PackSupplies', open: 60 },
    { name: 'Silicone Wire 10AWG (m)', category: 'consumable', sku: 'CONS-WIRE10', unit: 'm', unitPrice: 45, reorderLevel: 50, supplierName: 'PackSupplies', open: 220 },
    { name: 'XT60 Connector Pair', category: 'consumable', sku: 'CONS-XT60', unit: 'pair', unitPrice: 35, reorderLevel: 100, supplierName: 'PackSupplies', open: 400 },
    { name: 'Fuse 60A', category: 'consumable', sku: 'CONS-FUSE60', unit: 'pcs', unitPrice: 40, reorderLevel: 50, supplierName: 'PackSupplies', open: 25 },
    { name: 'Busbar Copper', category: 'other', sku: 'OTH-BUSBAR', unit: 'pcs', unitPrice: 120, reorderLevel: 40, supplierName: 'MetalWorks', open: 90 },
    { name: 'Thermal Pad', category: 'other', sku: 'OTH-THERMPAD', unit: 'pcs', unitPrice: 60, reorderLevel: 30, supplierName: 'PackSupplies', open: 70 },
  ];
  const items = {};
  for (const d of itemDefs) {
    let item = await Item.findOne({ sku: d.sku });
    if (!item) {
      item = await Item.create({ name: d.name, category: d.category, sku: d.sku, unit: d.unit, unitPrice: d.unitPrice, reorderLevel: d.reorderLevel, supplierName: d.supplierName });
      if (d.open > 0) {
        await applyStockMovement({ itemId: item._id, type: 'IN', qty: d.open, unitPriceAtTime: d.unitPrice, reference: 'Opening stock', occurredAt: daysAgo(40), createdBy: admin._id });
      }
    }
    items[d.sku] = await Item.findById(item._id);
  }
  // A couple of rejections (failed-purchase loss).
  if (!(await StockMovement.findOne({ type: 'REJECT' }))) {
    await applyStockMovement({ itemId: items['CELL-NMC-50']._id, type: 'REJECT', qty: 6, unitPriceAtTime: 980, supplierName: 'Pune Power', reason: 'Failed capacity test', occurredAt: daysAgo(20), createdBy: admin._id });
    await applyStockMovement({ itemId: items['BMS-4S-30A']._id, type: 'REJECT', qty: 3, unitPriceAtTime: 650, supplierName: 'BMS Tech India', reason: 'DOA', occurredAt: daysAgo(12), createdBy: admin._id });
  }
  console.log('[seed] inventory ready (with low-stock + rejections)');

  // --- Parties (debtor + creditor) ---
  const partyDefs = [
    { name: 'GreenRide EV Pvt Ltd', type: 'debtor', phone: '9876500001', gstin: '27ABCDE1234F1Z5', openingBalance: 15000 },
    { name: 'SolarMax OEM', type: 'debtor', phone: '9876500002', gstin: '27ABCDE9999F1Z2', openingBalance: 0 },
    { name: 'Nashik Cells Co', type: 'creditor', phone: '9876500003', gstin: '27ZZZZZ1111F1Z9', openingBalance: -22000 },
  ];
  const parties = {};
  for (const p of partyDefs) {
    let party = await Party.findOne({ name: p.name });
    if (!party) party = await Party.create(p);
    parties[p.name] = party;
  }
  console.log('[seed] parties ready');

  // --- Batteries dispatched + reworks ---
  if ((await Battery.countDocuments()) === 0) {
    const customers = [parties['GreenRide EV Pvt Ltd'], parties['SolarMax OEM']];
    const batteries = [];
    for (let i = 0; i < 8; i++) {
      const b = await createBattery({
        spec: { cell: 'LiFePO4', bms: '16S 48V', sizeMm: '300x200x120', voltage: 48, ah: 30, qty: 1 },
        customer: customers[i % 2]._id,
        dispatchDate: daysAgo(60 - i * 5),
        status: 'dispatched',
      }, { id: admin._id });
      batteries.push(b);
    }
    // 3 reworks with loss + aging
    await createRework({ battery: batteries[0]._id, returnDate: daysAgo(30), repairedDate: daysAgo(26), replacedParts: [{ item: items['BMS-16S-60A']._id, qty: 1, priceAtTime: 2200 }, { item: items['CONS-NICKEL']._id, qty: 0.5, priceAtTime: 1200 }], notes: 'BMS failure' }, { id: admin._id });
    await createRework({ battery: batteries[1]._id, returnDate: daysAgo(18), repairedDate: daysAgo(12), replacedParts: [{ item: items['CELL-LFP-100']._id, qty: 2, priceAtTime: 1450 }], notes: 'Cell imbalance' }, { id: admin._id });
    await createRework({ battery: batteries[2]._id, returnDate: daysAgo(8), repairedDate: daysAgo(3), replacedParts: [{ item: items['CONS-WIRE10']._id, qty: 3, priceAtTime: 45 }, { item: items['CONS-XT60']._id, qty: 1, priceAtTime: 35 }], notes: 'Connector burnt' }, { id: admin._id });
    console.log('[seed] batteries + reworks ready');
  }

  // --- Accounting entries (GST + non-GST, with specific hours) ---
  if ((await AccountingEntry.countDocuments()) === 0) {
    const entries = [];
    const kinds = ['sales', 'purchase', 'expense'];
    for (let i = 0; i < 30; i++) {
      const kind = kinds[i % 3];
      const gst = i % 2 === 0;
      const base = 5000 + i * 750;
      const tax = gst ? Math.round(base * 0.18) : 0;
      entries.push({
        kind, gst, amount: base, taxAmount: tax,
        party: kind === 'purchase' ? parties['Nashik Cells Co']._id : parties['GreenRide EV Pvt Ltd']._id,
        voucherNo: `${kind.slice(0, 2).toUpperCase()}-${1000 + i}`,
        narration: `${kind} entry ${i + 1}`,
        occurredAt: atHour(daysAgo(28 - i), 9 + (i % 9), (i * 7) % 60),
        source: 'manual',
      });
    }
    await AccountingEntry.insertMany(entries);
    console.log('[seed] accounting entries ready (GST/non-GST across hours)');
  }

  // --- Production: a week of jobs ---
  if ((await ProductionJob.countDocuments()) === 0) {
    const jobs = [];
    for (let d = 0; d < 7; d++) {
      const date = daysAgo(d);
      const perDay = 2 + (d % 3);
      for (let j = 0; j < perDay; j++) {
        jobs.push({
          productionDate: new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())),
          title: `Batch ${d}-${j}`, voltage: [12, 48, 60][j % 3], ah: [20, 30, 100][j % 3], qty: 1 + (j % 4),
          status: 'on', progress: ['pending', 'in_progress', 'done'][(d + j) % 3], createdBy: admin._id,
        });
      }
    }
    await ProductionJob.insertMany(jobs);
    console.log('[seed] production jobs ready (one week)');
  }

  // --- Employees + 1 month attendance ---
  const empDefs = [
    { code: 'EMP01', name: 'Ramesh Patil', designation: 'Cell Assembler', monthlySalary: 22000, esslUserId: '101' },
    { code: 'EMP02', name: 'Sunita More', designation: 'QC Inspector', monthlySalary: 26000, esslUserId: '102' },
    { code: 'EMP03', name: 'Imran Shaikh', designation: 'BMS Technician', monthlySalary: 30000, esslUserId: '103' },
    { code: 'EMP04', name: 'Pooja Jadhav', designation: 'Packaging', monthlySalary: 18000, esslUserId: '104' },
    { code: 'EMP05', name: 'Vikas Pawar', designation: 'Store Keeper', monthlySalary: 20000, esslUserId: '105' },
  ];
  const employees = [];
  for (const e of empDefs) {
    let emp = await Employee.findOne({ code: e.code });
    if (!emp) emp = await Employee.create({ ...e, active: true, joinedAt: daysAgo(365) });
    employees.push(emp);
  }
  if ((await Attendance.countDocuments()) === 0) {
    const rows = [];
    for (const emp of employees) {
      for (let d = 1; d <= 26; d++) {
        const date = daysAgo(d);
        if (date.getDay() === 0) continue; // skip Sundays
        const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const inT = atHour(date, 9, (emp.code.charCodeAt(4) % 20));
        const outT = atHour(date, 18, (d % 30));
        rows.push({ employee: emp._id, date: day, inTime: inT, outTime: outT, workedMinutes: Math.round((outT - inT) / 60000), source: 'manual' });
      }
    }
    await Attendance.insertMany(rows);
    console.log('[seed] employees + attendance ready');
  }

  // --- Catalogue products ---
  const productDefs = [
    { name: '48V 30Ah EV Battery Pack', slug: '48v-30ah-ev-pack', category: 'ev', priceFrom: 28000, featured: true, shortDesc: 'High-density LiFePO4 traction pack for e-bikes & e-rickshaws.', specs: { cell: 'LiFePO4', bms: '16S 48V 60A', voltage: 48, ah: 30, sizeMm: '300x200x120' }, seo: { title: '48V 30Ah EV LiFePO4 Battery Pack | E-mmortal', metaDescription: 'Custom 48V 30Ah LiFePO4 EV battery pack with smart BMS. Built to order in Nashik.', keywords: ['48v battery', 'ev lithium pack', 'lifepo4'] } },
    { name: '12V 100Ah LiFePO4 Battery', slug: '12v-100ah-lifepo4', category: 'solar', priceFrom: 32000, featured: true, shortDesc: 'Deep-cycle LiFePO4 for solar, inverter and backup.', specs: { cell: 'LiFePO4', bms: '4S 12V 100A', voltage: 12, ah: 100, sizeMm: '330x175x220' }, seo: { title: '12V 100Ah LiFePO4 Battery | E-mmortal', metaDescription: '12V 100Ah deep-cycle LiFePO4 battery for solar and inverter backup.', keywords: ['12v lifepo4', 'solar battery'] } },
    { name: '60V 40Ah Scooter Pack', slug: '60v-40ah-scooter-pack', category: 'ev', priceFrom: 46000, shortDesc: 'Performance pack for electric scooters.', specs: { cell: 'NMC', bms: '16S 60V 40A', voltage: 60, ah: 40, sizeMm: '360x240x130' }, seo: { title: '60V 40Ah Electric Scooter Battery | E-mmortal', metaDescription: '60V 40Ah NMC scooter battery pack, custom built.', keywords: ['60v battery', 'scooter pack'] } },
    { name: 'Solar OEM Pack 48V 100Ah', slug: 'solar-oem-48v-100ah', category: 'solar', priceFrom: 74000, shortDesc: 'OEM-grade solar storage pack with CAN BMS.', specs: { cell: 'LiFePO4', bms: '16S 48V 100A CAN', voltage: 48, ah: 100, sizeMm: '442x420x130' }, seo: { title: 'Solar OEM 48V 100Ah Battery | E-mmortal', metaDescription: 'OEM 48V 100Ah LiFePO4 solar storage pack with CAN BMS.', keywords: ['solar oem battery', '48v 100ah'] } },
    { name: '24V 50Ah Industrial Pack', slug: '24v-50ah-industrial', category: 'industrial', priceFrom: 38000, shortDesc: 'Rugged LiFePO4 for AGV and industrial equipment.', specs: { cell: 'LiFePO4', bms: '8S 24V 80A', voltage: 24, ah: 50, sizeMm: '300x250x150' }, seo: { title: '24V 50Ah Industrial LiFePO4 Battery | E-mmortal', metaDescription: '24V 50Ah industrial LiFePO4 battery for AGVs.', keywords: ['24v battery', 'industrial lithium'] } },
    { name: '72V 50Ah High-Range EV Pack', slug: '72v-50ah-ev-pack', category: 'ev', priceFrom: 68000, shortDesc: 'Long-range traction pack for L5 vehicles.', specs: { cell: 'NMC', bms: '20S 72V 80A', voltage: 72, ah: 50, sizeMm: '420x300x140' }, seo: { title: '72V 50Ah EV Battery Pack | E-mmortal', metaDescription: '72V 50Ah long-range NMC EV battery pack.', keywords: ['72v battery', 'l5 ev pack'] } },
  ];
  for (const p of productDefs) {
    const exists = await Product.findOne({ slug: p.slug });
    if (!exists) await Product.create({ ...p, active: true, images: [{ url: `https://placehold.co/800x500?text=${encodeURIComponent(p.name)}`, alt: p.name }] });
  }
  console.log('[seed] products ready');

  // --- Leads across sources + all 4 columns ---
  if ((await Lead.countDocuments()) === 0) {
    const statuses = ['new', 'in_progress', 'won', 'lost'];
    const sources = ['website', 'manual', 'csv', 'reference'];
    const leads = [];
    for (let i = 0; i < 10; i++) {
      leads.push({
        name: ['Aarav', 'Diya', 'Kabir', 'Anaya', 'Vivaan', 'Ira', 'Reyansh', 'Myra', 'Arjun', 'Sara'][i] + ' Customer',
        phone: `98765${String(10000 + i)}`,
        email: `lead${i}@example.com`,
        productInterest: productDefs[i % productDefs.length].name,
        qty: 1 + (i % 5),
        value: 20000 + i * 5000,
        source: sources[i % sources.length],
        status: statuses[i % statuses.length],
        boardOrder: i,
        owner: users.manager._id,
        history: [{ from: null, to: statuses[i % statuses.length], at: daysAgo(15 - i) }],
      });
    }
    await Lead.insertMany(leads);
    console.log('[seed] leads ready (all sources + columns)');
  }

  console.log('\n[seed] DONE ✅');
  console.log('Login: admin@emmortal.local / Admin@123 | manager@emmortal.local / Manager@123 | staff@emmortal.local / Staff@123');
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
