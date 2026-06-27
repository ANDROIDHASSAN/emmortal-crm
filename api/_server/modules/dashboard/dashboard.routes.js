import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler, round2 } from '../../utils/helpers.js';
import { Item, StockMovement, Rework, Lead, ProductionJob, Attendance, AccountingEntry } from '../../models/index.js';
import { ProductionJob as PJ } from '../../models/ProductionJob.js';

const router = Router();

router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const { start, end } = PJ.dayBounds(new Date().toISOString());
  const today = new Date(); const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  // These queries are independent — run them concurrently (latency = slowest, not sum).
  const [items, reworkAgg, openLeads, jobs, presentToday] = await Promise.all([
    Item.find({ active: true }).lean(),
    Rework.aggregate([{ $match: { returnDate: { $gte: monthStart } } }, { $group: { _id: null, loss: { $sum: '$totalLoss' } } }]),
    Lead.countDocuments({ status: { $nin: ['won', 'lost'] } }),
    ProductionJob.find({ productionDate: { $gte: start, $lte: end } }).lean(),
    Attendance.countDocuments({ date: todayStart }),
  ]);

  const stockValue = round2(items.reduce((s, i) => s + i.qtyOnHand * i.unitPrice, 0));
  const lowStockCount = items.filter((i) => i.qtyOnHand <= i.reorderLevel).length;

  res.json({ data: {
    stockValue, lowStockCount,
    monthReworkLoss: round2(reworkAgg[0]?.loss || 0),
    openLeads,
    production: { total: jobs.length, done: jobs.filter((j) => j.progress === 'done').length, pending: jobs.filter((j) => j.progress === 'pending').length },
    presentToday,
  } });
}));

router.get('/charts', requireAuth, asyncHandler(async (req, res) => {
  const sixMonths = new Date(); sixMonths.setUTCMonth(sixMonths.getUTCMonth() - 5); sixMonths.setUTCDate(1);

  // Independent queries → run concurrently.
  const [reworks, leadAgg, salesAgg] = await Promise.all([
    Rework.find({ returnDate: { $gte: sixMonths } }).lean(),
    Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    AccountingEntry.aggregate([{ $match: { kind: 'sales' } }, { $group: { _id: '$gst', amount: { $sum: { $add: ['$amount', '$taxAmount'] } } } }]),
  ]);

  const byMonth = {};
  for (const r of reworks) { const d = new Date(r.returnDate); const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; byMonth[k] = round2((byMonth[k] || 0) + r.totalLoss); }
  const reworkLossTrend = Object.entries(byMonth).map(([month, loss]) => ({ month, loss })).sort((a, b) => a.month.localeCompare(b.month));
  const leadsByStatus = leadAgg.map((r) => ({ status: r._id, count: r.count }));
  const salesGstSplit = salesAgg.map((r) => ({ type: r._id ? 'GST' : 'Non-GST', amount: round2(r.amount) }));

  res.json({ data: { reworkLossTrend, leadsByStatus, salesGstSplit } });
}));

export default router;
