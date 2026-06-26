import { AccountingEntry } from '../../models/AccountingEntry.js';
import { Party } from '../../models/Party.js';
import { TallySyncLog } from '../../models/TallySyncLog.js';
import { round2 } from '../../utils/helpers.js';
import { env } from '../../config/env.js';
import { ImportTallyAdapter, HttpTallyAdapter } from '../../integrations/tally.adapter.js';

async function resolvePartyByName(name) {
  if (!name) return undefined;
  const trimmed = name.trim();
  let party = await Party.findOne({ name: trimmed });
  if (!party) party = await Party.create({ name: trimmed, type: 'both' });
  return party._id;
}

// Idempotent upsert by tallyGuid.
export async function upsertVouchers(vouchers, source = 'tally') {
  let upserted = 0; const errors = [];
  for (const v of vouchers) {
    try {
      const party = await resolvePartyByName(v.partyName);
      const doc = { kind: v.kind, gst: !!v.gst, amount: round2(v.amount || 0), taxAmount: round2(v.taxAmount || 0), party, voucherNo: v.voucherNo || '', narration: v.narration || '', occurredAt: v.occurredAt ? new Date(v.occurredAt) : new Date(), source };
      if (v.tallyGuid) {
        const r = await AccountingEntry.updateOne({ tallyGuid: v.tallyGuid }, { $set: { ...doc, tallyGuid: v.tallyGuid } }, { upsert: true });
        if (r.upsertedCount || r.modifiedCount) upserted += 1;
      } else { await AccountingEntry.create(doc); upserted += 1; }
    } catch (e) { errors.push(e.message); }
  }
  return { upserted, errors };
}

// Unified Tally sync: live HTTP gateway when mode='http', else file upload.
// Never blocks the app — failures are logged and surfaced, not thrown to cron.
export async function runTallySync({ mode, fileBuffer, fileName, from, to }) {
  const useMode = mode || env.TALLY_SYNC_MODE || 'import';
  const log = await TallySyncLog.create({ mode: useMode === 'http' ? 'http' : 'import', status: 'running' });
  try {
    let adapter;
    if (useMode === 'http') {
      if (!env.TALLY_HTTP_URL) throw new Error('TALLY_HTTP_URL not configured');
      adapter = new HttpTallyAdapter({ url: env.TALLY_HTTP_URL, from, to });
    } else {
      if (!fileBuffer) throw new Error('No import file provided');
      adapter = new ImportTallyAdapter({ fileBuffer, fileName });
    }
    const vouchers = await adapter.fetchVouchers();
    const { upserted, errors } = await upsertVouchers(vouchers, 'tally');
    Object.assign(log, { recordsIn: vouchers.length, recordsUpserted: upserted, errors, finishedAt: new Date(), status: errors.length ? 'partial' : 'success' });
    await log.save();
    return log.toObject();
  } catch (err) {
    Object.assign(log, { status: 'failed', errors: [err.message], finishedAt: new Date() });
    await log.save();
    throw err;
  }
}

// Backwards-compatible alias (upload path).
export const runTallyImport = (args) => runTallySync({ ...args, mode: 'import' });

// Summation + GST split + difference across a time window.
export async function entrySummary({ from, to, gst }) {
  const match = {};
  if (from || to) { match.occurredAt = {}; if (from) match.occurredAt.$gte = new Date(from); if (to) match.occurredAt.$lte = new Date(to); }
  if (gst !== undefined) match.gst = gst === 'true' || gst === true;
  const rows = await AccountingEntry.aggregate([{ $match: match }, { $group: { _id: { kind: '$kind', gst: '$gst' }, amount: { $sum: '$amount' }, tax: { $sum: '$taxAmount' }, count: { $sum: 1 } } }]);
  const buckets = { sales: 0, purchase: 0, expense: 0 }; const gstSplit = { gst: 0, nonGst: 0 }; let totalTax = 0;
  for (const r of rows) {
    const total = round2(r.amount + r.tax);
    buckets[r._id.kind] = round2((buckets[r._id.kind] || 0) + total);
    totalTax = round2(totalTax + r.tax);
    if (r._id.gst) gstSplit.gst = round2(gstSplit.gst + total); else gstSplit.nonGst = round2(gstSplit.nonGst + total);
  }
  return { buckets, gstSplit, totalTax, difference: round2(buckets.sales - (buckets.purchase + buckets.expense)), breakdown: rows };
}

export async function partyLedger(partyId) {
  const party = await Party.findById(partyId).lean();
  if (!party) return null;
  const entries = await AccountingEntry.find({ party: partyId }).sort('occurredAt').lean();
  let balance = party.openingBalance || 0;
  const ledger = entries.map((e) => { const total = round2(e.amount + (e.taxAmount || 0)); const delta = e.kind === 'sales' ? total : -total; balance = round2(balance + delta); return { ...e, delta, balance }; });
  return { party, openingBalance: party.openingBalance || 0, ledger, closingBalance: balance };
}
