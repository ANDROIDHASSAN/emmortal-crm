import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler, round2 } from '../../utils/helpers.js';
import { Item, StockMovement, Rework, Lead, ProductionJob, Attendance, AccountingEntry } from '../../models/index.js';
import { ProductionJob as PJ } from '../../models/ProductionJob.js';

const router = Router();

router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  const items = await Item.find({ active: true }).lean();
  const stockValue = round2(items.reduce((s, i) => s + i.qtyOnHand * i.unitPrice, 0));
  const lowStockCount = items.filter((i) => i.qtyOnHand <= i.reorderLevel).length;

  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const reworkAgg = await Rework.aggregate([{ $match: { returnDate: { $gte: monthStart } } }, { $group: { _id: null, loss: { $sum: '$totalLoss' } } }]);

  const openLeads = await Lead.countDocuments({ status: { $nin: ['won', 'lost'] } });

  const { start, end } = PJ.dayBounds(new Date().toISOString());
  const jobs = await ProductionJob.find({ productionDate: { $gte: start, $lte: end } }).lean();

  const today = new Date(); const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const presentToday = await Attendance.countDocuments({ date: todayStart });

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
  const reworks = await Rework.find({ returnDate: { $gte: sixMonths } }).lean();
  const byMonth = {};
  for (const r of reworks) { const d = new Date(r.returnDate); const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; byMonth[k] = round2((byMonth[k] || 0) + r.totalLoss); }
  const reworkLossTrend = Object.entries(byMonth).map(([month, loss]) => ({ month, loss })).sort((a, b) => a.month.localeCompare(b.month));

  const leadAgg = await Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const leadsByStatus = leadAgg.map((r) => ({ status: r._id, count: r.count }));

  const salesAgg = await AccountingEntry.aggregate([{ $match: { kind: 'sales' } }, { $group: { _id: '$gst', amount: { $sum: { $add: ['$amount', '$taxAmount'] } } } }]);
  const salesGstSplit = salesAgg.map((r) => ({ type: r._id ? 'GST' : 'Non-GST', amount: round2(r.amount) }));

  res.json({ data: { reworkLossTrend, leadsByStatus, salesGstSplit } });
}));

export default router;
