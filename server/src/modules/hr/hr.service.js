import { Employee } from '../../models/Employee.js';
import { Attendance } from '../../models/Attendance.js';
import { ImportEsslAdapter } from '../../integrations/essl/essl.adapter.js';
import { round2 } from '../../utils/helpers.js';

function dayStart(d) {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

/**
 * Import eSSL punches → group per esslUserId per day → first=in, last=out → workedMinutes.
 * Idempotent upsert keyed on (employee, date). Unmapped esslUserIds are returned, not dropped.
 */
export async function syncEsslPunches({ fileBuffer, fileName }) {
  if (!fileBuffer) throw new Error('No import file provided');
  const adapter = new ImportEsslAdapter({ fileBuffer, fileName });
  const punches = await adapter.fetchPunches();

  // Map esslUserId → Employee
  const employees = await Employee.find({ esslUserId: { $ne: '' } }).lean();
  const byEssl = new Map(employees.map((e) => [String(e.esslUserId), e]));

  // Group punches: key = esslUserId|dayISO
  const groups = new Map();
  const unmappedIds = new Set();
  for (const p of punches) {
    if (!p.ts || Number.isNaN(p.ts.getTime())) continue;
    const emp = byEssl.get(String(p.esslUserId));
    if (!emp) {
      unmappedIds.add(String(p.esslUserId));
      continue;
    }
    const day = dayStart(p.ts).toISOString();
    const key = `${emp._id}|${day}`;
    if (!groups.has(key)) groups.set(key, { emp, day: dayStart(p.ts), times: [] });
    groups.get(key).times.push(p.ts);
  }

  let upserted = 0;
  for (const { emp, day, times } of groups.values()) {
    times.sort((a, b) => a - b);
    const inTime = times[0];
    const outTime = times[times.length - 1];
    const workedMinutes = times.length > 1 ? Math.round((outTime - inTime) / 60000) : 0;
    await Attendance.updateOne(
      { employee: emp._id, date: day },
      { $set: { employee: emp._id, date: day, inTime, outTime, workedMinutes, source: 'essl' } },
      { upsert: true }
    );
    upserted += 1;
  }

  return {
    punches: punches.length,
    daysUpserted: upserted,
    unmappedUserIds: [...unmappedIds],
  };
}

// Payroll view: salary per active employee for a chosen month (YYYY-MM) + attendance stats.
export async function payroll(month) {
  const [y, m] = (month || '').split('-').map(Number);
  const now = new Date();
  const year = y || now.getUTCFullYear();
  const mon = (m || now.getUTCMonth() + 1) - 1;
  const start = new Date(Date.UTC(year, mon, 1));
  const end = new Date(Date.UTC(year, mon + 1, 0, 23, 59, 59, 999));

  const employees = await Employee.find({ active: true }).sort('name').lean();
  const rows = [];
  for (const e of employees) {
    const records = await Attendance.find({ employee: e._id, date: { $gte: start, $lte: end } }).lean();
    const presentDays = records.filter((r) => r.workedMinutes > 0 || r.inTime).length;
    const totalMinutes = records.reduce((s, r) => s + (r.workedMinutes || 0), 0);
    rows.push({
      employee: { id: e._id, code: e.code, name: e.name, designation: e.designation },
      monthlySalary: round2(e.monthlySalary || 0),
      presentDays,
      totalHours: round2(totalMinutes / 60),
    });
  }
  return { month: `${year}-${String(mon + 1).padStart(2, '0')}`, rows, totalSalary: round2(rows.reduce((s, r) => s + r.monthlySalary, 0)) };
}
