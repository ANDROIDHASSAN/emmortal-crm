import { Battery } from '../../models/Battery.js';
import { Rework } from '../../models/Rework.js';
import { Item } from '../../models/Item.js';
import { ApiError } from '../../utils/ApiError.js';
import { round2, sum2 } from '../../utils/helpers.js';
import { applyStockMovement } from '../inventory/inventory.service.js';

// Generate a human-readable unique battery ID at birth: EMM-YYYY-#### (sequential per year).
export async function generateBatteryId(date = new Date()) {
  const year = date.getFullYear();
  const prefix = `EMM-${year}-`;
  const last = await Battery.findOne({ uniqueId: new RegExp(`^${prefix}`) })
    .sort('-uniqueId')
    .lean();
  let next = 1;
  if (last) {
    const n = parseInt(last.uniqueId.slice(prefix.length), 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function createBattery(payload, user) {
  const uniqueId = payload.uniqueId || (await generateBatteryId(payload.dispatchDate ? new Date(payload.dispatchDate) : new Date()));
  return Battery.create({
    uniqueId,
    spec: payload.spec || {},
    customer: payload.customer || undefined,
    dispatchDate: payload.dispatchDate ? new Date(payload.dispatchDate) : undefined,
    status: payload.status || 'dispatched',
    productionJob: payload.productionJob || undefined,
    createdBy: user?.id,
  });
}

const dayMs = 24 * 60 * 60 * 1000;

/**
 * Create a rework record:
 *  - price each replaced part at replacement time → lineCost, totalLoss
 *  - consume inventory via OUT stock movements
 *  - flip battery status, compute turnaround (return → repaired, fallback dispatch → repaired)
 */
export async function createRework(payload, user) {
  const battery = await Battery.findById(payload.battery);
  if (!battery) throw ApiError.notFound('Battery not found');

  const returnDate = new Date(payload.returnDate);
  const repairedDate = payload.repairedDate ? new Date(payload.repairedDate) : null;

  // Resolve replacement-time prices (fallback to current item unitPrice).
  const replacedParts = [];
  for (const p of payload.replacedParts || []) {
    const item = await Item.findById(p.item);
    if (!item) throw ApiError.notFound(`Replaced item not found: ${p.item}`);
    const priceAtTime = p.priceAtTime != null ? Number(p.priceAtTime) : item.unitPrice;
    const lineCost = round2(Number(p.qty) * priceAtTime);
    replacedParts.push({ item: item._id, qty: Number(p.qty), priceAtTime, lineCost });
  }

  const totalLoss = sum2(replacedParts.map((p) => p.lineCost));

  let turnaroundDays = 0;
  if (repairedDate) {
    const base = returnDate || battery.dispatchDate;
    if (base) turnaroundDays = Math.max(0, Math.round((repairedDate - base) / dayMs));
  }

  const rework = await Rework.create({
    battery: battery._id,
    returnDate,
    repairedDate,
    replacedParts,
    totalLoss,
    turnaroundDays,
    notes: payload.notes || '',
    createdBy: user?.id,
  });

  // Consume inventory for each replaced part (rework eats stock — it's E-mmortal's loss).
  for (const p of replacedParts) {
    await applyStockMovement({
      itemId: p.item,
      type: 'OUT',
      qty: p.qty,
      unitPriceAtTime: p.priceAtTime,
      reference: `Rework ${battery.uniqueId}`,
      reason: 'rework-consumption',
      occurredAt: returnDate,
      createdBy: user?.id,
    });
  }

  // Flip battery status.
  battery.status = repairedDate ? 'repaired' : 'in_rework';
  await battery.save();

  return rework;
}

// Full history file for one battery (the "one ID tells the whole story").
export async function batteryHistory(uniqueId) {
  const battery = await Battery.findOne({ uniqueId })
    .populate('customer', 'name phone email')
    .lean();
  if (!battery) throw ApiError.notFound('Battery not found');
  const reworks = await Rework.find({ battery: battery._id })
    .populate('replacedParts.item', 'name sku unit')
    .sort('returnDate')
    .lean();
  const totalLoss = sum2(reworks.map((r) => r.totalLoss));
  return { battery, reworks, summary: { reworkCount: reworks.length, totalLoss } };
}

function periodKey(date, period) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  if (period === 'monthly') return `${y}-${m}`;
  if (period === 'weekly') {
    const onejan = new Date(Date.UTC(y, 0, 1));
    const week = Math.ceil(((d - onejan) / dayMs + onejan.getUTCDay() + 1) / 7);
    return `${y}-W${String(week).padStart(2, '0')}`;
  }
  return `${y}-${m}-${day}`; // daily
}

// Loss totals per period (and overall + per battery).
export async function lossReport({ from, to, period = 'monthly' }) {
  const filter = {};
  if (from || to) {
    filter.returnDate = {};
    if (from) filter.returnDate.$gte = new Date(from);
    if (to) filter.returnDate.$lte = new Date(to);
  }
  const reworks = await Rework.find(filter).populate('battery', 'uniqueId').lean();
  const byPeriod = {};
  const byBattery = {};
  for (const r of reworks) {
    const key = periodKey(r.returnDate, period);
    byPeriod[key] = round2((byPeriod[key] || 0) + r.totalLoss);
    const b = r.battery?.uniqueId || 'unknown';
    byBattery[b] = round2((byBattery[b] || 0) + r.totalLoss);
  }
  const total = sum2(reworks.map((r) => r.totalLoss));
  return {
    period,
    total,
    byPeriod: Object.entries(byPeriod).map(([k, v]) => ({ period: k, loss: v })).sort((a, b) => a.period.localeCompare(b.period)),
    byBattery: Object.entries(byBattery).map(([k, v]) => ({ battery: k, loss: v })),
  };
}

// Aging report: average turnaround across repaired batteries.
export async function agingReport({ from, to }) {
  const filter = { repairedDate: { $ne: null } };
  if (from || to) {
    filter.returnDate = {};
    if (from) filter.returnDate.$gte = new Date(from);
    if (to) filter.returnDate.$lte = new Date(to);
  }
  const reworks = await Rework.find(filter).lean();
  const repaired = reworks.filter((r) => r.repairedDate);
  const avg = repaired.length
    ? round2(repaired.reduce((s, r) => s + (r.turnaroundDays || 0), 0) / repaired.length)
    : 0;
  return {
    repairedCount: repaired.length,
    avgTurnaroundDays: avg,
    maxTurnaroundDays: repaired.reduce((m, r) => Math.max(m, r.turnaroundDays || 0), 0),
  };
}
