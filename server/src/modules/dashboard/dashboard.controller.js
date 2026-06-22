import { Item } from '../../models/Item.js';
import { Rework } from '../../models/Rework.js';
import { Lead } from '../../models/Lead.js';
import { ProductionJob } from '../../models/ProductionJob.js';
import { Attendance } from '../../models/Attendance.js';
import { AccountingEntry } from '../../models/AccountingEntry.js';
import { asyncHandler, round2 } from '../../utils/helpers.js';
import { inventorySummary } from '../inventory/inventory.service.js';

function monthRange(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}
function todayRange(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

export const dashboardSummary = asyncHandler(async (req, res) => {
  const { start: mStart, end: mEnd } = monthRange();
  const { start: tStart, end: tEnd } = todayRange();

  const [inv, reworkLossAgg, openLeads, todayJobs, presentToday] = await Promise.all([
    inventorySummary(),
    Rework.aggregate([
      { $match: { returnDate: { $gte: mStart, $lte: mEnd } } },
      { $group: { _id: null, loss: { $sum: '$totalLoss' } } },
    ]),
    Lead.countDocuments({ status: { $in: ['new', 'in_progress'] } }),
    ProductionJob.find({ productionDate: { $gte: tStart, $lte: tEnd } }).lean(),
    Attendance.countDocuments({ date: { $gte: tStart, $lte: tEnd }, inTime: { $ne: null } }),
  ]);

  res.json({
    data: {
      stockValue: inv.onHandValue,
      lowStockCount: inv.lowStockCount,
      rejectionValue: inv.rejection.value,
      monthReworkLoss: round2(reworkLossAgg[0]?.loss || 0),
      openLeads,
      production: {
        total: todayJobs.length,
        done: todayJobs.filter((j) => j.progress === 'done').length,
        pending: todayJobs.filter((j) => j.progress !== 'done').length,
      },
      presentToday,
    },
  });
});

export const charts = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 5, 1);
  since.setUTCHours(0, 0, 0, 0);

  const [reworkTrend, leadsByStatus, salesGst] = await Promise.all([
    Rework.aggregate([
      { $match: { returnDate: { $gte: since } } },
      {
        $group: {
          _id: { y: { $year: '$returnDate' }, m: { $month: '$returnDate' } },
          loss: { $sum: '$totalLoss' },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    AccountingEntry.aggregate([
      { $match: { kind: 'sales', occurredAt: { $gte: since } } },
      { $group: { _id: '$gst', amount: { $sum: { $add: ['$amount', '$taxAmount'] } } } },
    ]),
  ]);

  res.json({
    data: {
      reworkLossTrend: reworkTrend.map((r) => ({
        month: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`,
        loss: round2(r.loss),
      })),
      leadsByStatus: leadsByStatus.map((r) => ({ status: r._id, count: r.count })),
      salesGstSplit: salesGst.map((r) => ({ type: r._id ? 'GST' : 'Non-GST', amount: round2(r.amount) })),
    },
  });
});
