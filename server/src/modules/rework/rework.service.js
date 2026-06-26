import QRCode from 'qrcode';
import { Battery } from '../../models/Battery.js';
import { Rework } from '../../models/Rework.js';
import { Item } from '../../models/Item.js';
import { ApiError } from '../../utils/ApiError.js';
import { round2, sum2 } from '../../utils/helpers.js';
import { applyStockMovement } from '../inventory/inventory.service.js';

const dayMs = 24 * 60 * 60 * 1000;

// EMM-YYYY-#### sequential per calendar year.
export async function generateBatteryId(date = new Date()) {
  const prefix = `EMM-${date.getFullYear()}-`;
  const last = await Battery.findOne({ uniqueId: new RegExp(`^${prefix}`) }).sort('-uniqueId').lean();
  let next = 1;
  if (last) { const n = parseInt(last.uniqueId.slice(prefix.length), 10); if (!Number.isNaN(n)) next = n + 1; }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function createBattery(payload, user) {
  const uniqueId = payload.uniqueId || (await generateBatteryId(payload.dispatchDate ? new Date(payload.dispatchDate) : new Date()));
  return Battery.create({
    uniqueId, spec: payload.spec || {},
    customer: payload.customer || undefined,
    dispatchDate: payload.dispatchDate ? new Date(payload.dispatchDate) : undefined,
    status: payload.status || 'dispatched', createdBy: user?.id,
  });
}

// Rework consumes inventory (it's E-mmortal's loss), prices parts at replacement
// time, flips battery status and computes turnaround.
export async function createRework(payload, user) {
  const battery = await Battery.findById(payload.battery);
  if (!battery) throw ApiError.notFound('Battery not found');
  const returnDate = new Date(payload.returnDate);
  const repairedDate = payload.repairedDate ? new Date(payload.repairedDate) : null;

  const replacedParts = [];
  for (const p of payload.replacedParts || []) {
    const item = await Item.findById(p.item);
    if (!item) throw ApiError.notFound(`Replaced item not found: ${p.item}`);
    const priceAtTime = p.priceAtTime != null ? Number(p.priceAtTime) : item.unitPrice;
    replacedParts.push({ item: item._id, qty: Number(p.qty), priceAtTime, lineCost: round2(Number(p.qty) * priceAtTime) });
  }
  const totalLoss = sum2(replacedParts.map((p) => p.lineCost));

  let turnaroundDays = 0;
  if (repairedDate) { const base = returnDate || battery.dispatchDate; if (base) turnaroundDays = Math.max(0, Math.round((repairedDate - base) / dayMs)); }

  const rework = await Rework.create({
    battery: battery._id, returnDate, repairedDate, problem: payload.problem || '',
    technician: payload.technician || '', replacedParts, totalLoss, turnaroundDays,
    notes: payload.notes || '', createdBy: user?.id,
  });

  for (const p of replacedParts) {
    await applyStockMovement({ itemId: p.item, type: 'OUT', qty: p.qty, unitPriceAtTime: p.priceAtTime, reference: `Rework ${battery.uniqueId}`, reason: 'rework-consumption', occurredAt: returnDate, createdBy: user?.id });
  }
  battery.status = repairedDate ? 'repaired' : 'in_rework';
  await battery.save();
  return rework;
}

export async function batteryHistory(uniqueId) {
  const battery = await Battery.findOne({ uniqueId }).populate('customer', 'name phone email').lean();
  if (!battery) throw ApiError.notFound('Battery not found');
  const reworks = await Rework.find({ battery: battery._id }).populate('replacedParts.item', 'name sku unit').sort('returnDate').lean();
  const qrDataUrl = await QRCode.toDataURL(battery.uniqueId, { margin: 1, width: 220 });
  return { battery, reworks, summary: { reworkCount: reworks.length, totalLoss: sum2(reworks.map((r) => r.totalLoss)) }, qrDataUrl };
}

function periodKey(date, period) {
  const d = new Date(date), y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0');
  if (period === 'monthly') return `${y}-${m}`;
  if (period === 'weekly') { const onejan = new Date(Date.UTC(y, 0, 1)); const week = Math.ceil(((d - onejan) / dayMs + onejan.getUTCDay() + 1) / 7); return `${y}-W${String(week).padStart(2, '0')}`; }
  return `${y}-${m}-${day}`;
}

export async function lossReport({ from, to, period = 'monthly' }) {
  const filter = {};
  if (from || to) { filter.returnDate = {}; if (from) filter.returnDate.$gte = new Date(from); if (to) filter.returnDate.$lte = new Date(to); }
  const reworks = await Rework.find(filter).populate('battery', 'uniqueId').lean();
  const byPeriod = {}, byBattery = {};
  for (const r of reworks) {
    const k = periodKey(r.returnDate, period); byPeriod[k] = round2((byPeriod[k] || 0) + r.totalLoss);
    const b = r.battery?.uniqueId || 'unknown'; byBattery[b] = round2((byBattery[b] || 0) + r.totalLoss);
  }
  return {
    period, total: sum2(reworks.map((r) => r.totalLoss)),
    byPeriod: Object.entries(byPeriod).map(([k, v]) => ({ period: k, loss: v })).sort((a, b) => a.period.localeCompare(b.period)),
    byBattery: Object.entries(byBattery).map(([k, v]) => ({ battery: k, loss: v })),
  };
}

export async function agingReport({ from, to }) {
  const filter = { repairedDate: { $ne: null } };
  if (from || to) { filter.returnDate = {}; if (from) filter.returnDate.$gte = new Date(from); if (to) filter.returnDate.$lte = new Date(to); }
  const reworks = await Rework.find(filter).lean();
  const repaired = reworks.filter((r) => r.repairedDate);
  const avg = repaired.length ? round2(repaired.reduce((s, r) => s + (r.turnaroundDays || 0), 0) / repaired.length) : 0;
  return { repairedCount: repaired.length, avgTurnaroundDays: avg, maxTurnaroundDays: repaired.reduce((m, r) => Math.max(m, r.turnaroundDays || 0), 0) };
}
