import { Employee } from '../../models/Employee.js';
import { Attendance } from '../../models/Attendance.js';
import { ImportEsslAdapter } from '../../integrations/essl.adapter.js';
import { round2 } from '../../utils/helpers.js';

const dayStart = (d) => { const x = new Date(d); return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())); };

// Shared core: group punches per employee per day (first=in, last=out) and
// idempotently upsert Attendance. Used by file import AND the push webhook.
export async function ingestPunches(punches) {
  const employees = await Employee.find({ esslUserId: { $ne: '' } }).lean();
  const byEssl = new Map(employees.map((e) => [String(e.esslUserId), e]));
  const groups = new Map(); const unmapped = new Set();
  for (const p of punches) {
    const emp = byEssl.get(String(p.esslUserId));
    if (!emp) { unmapped.add(String(p.esslUserId)); continue; }
    const day = dayStart(p.ts).toISOString(); const key = `${emp._id}|${day}`;
    if (!groups.has(key)) groups.set(key, { emp, day: dayStart(p.ts), times: [] });
    groups.get(key).times.push(p.ts);
  }
  let upserted = 0;
  for (const { emp, day, times } of groups.values()) {
    times.sort((a, b) => a - b);
    const inTime = times[0], outTime = times[times.length - 1];
    const workedMinutes = times.length > 1 ? Math.round((outTime - inTime) / 60000) : 0;
    await Attendance.updateOne({ employee: emp._id, date: day }, { $set: { employee: emp._id, date: day, inTime, outTime, workedMinutes, source: 'essl' } }, { upsert: true });
    upserted += 1;
  }
  return { punches: punches.length, daysUpserted: upserted, unmappedUserIds: [...unmapped] };
}

// File import path (eTimeTrackLite export .dat/.csv).
export async function syncEsslPunches({ fileBuffer, fileName }) {
  if (!fileBuffer) throw new Error('No import file provided');
  const punches = await new ImportEsslAdapter({ fileBuffer, fileName }).fetchPunches();
  return ingestPunches(punches);
}

export async function payroll(month) {
  const [y, m] = (month || '').split('-').map(Number);
  const now = new Date();
  const year = y || now.getUTCFullYear(); const mon = (m || now.getUTCMonth() + 1) - 1;
  const start = new Date(Date.UTC(year, mon, 1)); const end = new Date(Date.UTC(year, mon + 1, 0, 23, 59, 59, 999));
  // Expected working days = weekdays (Mon–Sat) elapsed in the month up to today.
  const lastDay = Math.min(end.getUTCDate(), (year === now.getUTCFullYear() && mon === now.getUTCMonth()) ? now.getUTCDate() : end.getUTCDate());
  let workingDays = 0;
  for (let d = 1; d <= lastDay; d++) { const wd = new Date(Date.UTC(year, mon, d)).getUTCDay(); if (wd !== 0) workingDays += 1; } // exclude Sundays

  const employees = await Employee.find({ active: true }).sort('name').lean();
  const rows = [];
  for (const e of employees) {
    const records = await Attendance.find({ employee: e._id, date: { $gte: start, $lte: end } }).lean();
    const presentDays = records.filter((r) => r.workedMinutes > 0 || r.inTime).length;
    const shortDays = records.filter((r) => r.workedMinutes > 0 && r.workedMinutes < 480).length; // < 8h
    const absentDays = Math.max(0, workingDays - presentDays);
    const totalMinutes = records.reduce((s, r) => s + (r.workedMinutes || 0), 0);
    rows.push({ employee: { id: e._id, code: e.code, name: e.name, designation: e.designation }, monthlySalary: round2(e.monthlySalary || 0), presentDays, absentDays, shortDays, totalHours: round2(totalMinutes / 60) });
  }
  return { month: `${year}-${String(mon + 1).padStart(2, '0')}`, workingDays, rows, totalSalary: round2(rows.reduce((s, r) => s + r.monthlySalary, 0)) };
}
