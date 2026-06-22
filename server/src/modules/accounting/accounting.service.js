import { AccountingEntry } from '../../models/AccountingEntry.js';
import { Party } from '../../models/Party.js';
import { TallySyncLog } from '../../models/TallySyncLog.js';
import { round2, sum2 } from '../../utils/helpers.js';
import { ImportTallyAdapter, HttpTallyAdapter } from '../../integrations/tally/tally.adapter.js';
import { env } from '../../config/env.js';

// Resolve (or create) a party by name during Tally import.
async function resolvePartyByName(name) {
  if (!name) return undefined;
  const trimmed = name.trim();
  let party = await Party.findOne({ name: trimmed });
  if (!party) party = await Party.create({ name: trimmed, type: 'both' });
  return party._id;
}

// Upsert vouchers idempotently by tallyGuid. Returns counts.
export async function upsertVouchers(vouchers, source = 'tally') {
  let upserted = 0;
  const errors = [];
  for (const v of vouchers) {
    try {
      const party = await resolvePartyByName(v.partyName);
      const doc = {
        kind: v.kind,
        gst: !!v.gst,
        amount: round2(v.amount || 0),
        taxAmount: round2(v.taxAmount || 0),
        party,
        voucherNo: v.voucherNo || '',
        narration: v.narration || '',
        occurredAt: v.occurredAt ? new Date(v.occurredAt) : new Date(),
        source,
      };
      if (v.tallyGuid) {
        const r = await AccountingEntry.updateOne(
          { tallyGuid: v.tallyGuid },
          { $set: { ...doc, tallyGuid: v.tallyGuid } },
          { upsert: true }
        );
        if (r.upsertedCount || r.modifiedCount) upserted += 1;
      } else {
        await AccountingEntry.create(doc);
        upserted += 1;
      }
    } catch (e) {
      errors.push(e.message);
    }
  }
  return { upserted, errors };
}

export async function runTallySync({ mode, fileBuffer, fileName, from, to }) {
  const useMode = mode || env.TALLY_SYNC_MODE || 'import';
  const log = await TallySyncLog.create({ mode: useMode, status: 'running' });
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
    log.recordsIn = vouchers.length;
    log.recordsUpserted = upserted;
    log.errors = errors;
    log.finishedAt = new Date();
    log.status = errors.length ? 'partial' : 'success';
    await log.save();
    return log.toObject();
  } catch (err) {
    log.finishedAt = new Date();
    log.status = 'failed';
    log.errors = [err.message];
    await log.save();
    throw err;
  }
}

// Summation + difference view across a window, optionally GST-filtered.
export async function entrySummary({ from, to, gst }) {
  const match = {};
  if (from || to) {
    match.occurredAt = {};
    if (from) match.occurredAt.$gte = new Date(from);
    if (to) match.occurredAt.$lte = new Date(to);
  }
  if (gst !== undefined) match.gst = gst;

  const rows = await AccountingEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: { kind: '$kind', gst: '$gst' },
        amount: { $sum: '$amount' },
        tax: { $sum: '$taxAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const buckets = { sales: 0, purchase: 0, expense: 0 };
  const gstSplit = { gst: 0, nonGst: 0 };
  let totalTax = 0;
  for (const r of rows) {
    const total = round2(r.amount + r.tax);
    buckets[r._id.kind] = round2((buckets[r._id.kind] || 0) + total);
    totalTax = round2(totalTax + r.tax);
    if (r._id.gst) gstSplit.gst = round2(gstSplit.gst + total);
    else gstSplit.nonGst = round2(gstSplit.nonGst + total);
  }
  const difference = round2(buckets.sales - (buckets.purchase + buckets.expense));
  return { buckets, gstSplit, totalTax, difference, breakdown: rows };
}

// Per-party running ledger (debtor/creditor drilldown).
export async function partyLedger(partyId) {
  const party = await Party.findById(partyId).lean();
  if (!party) return null;
  const entries = await AccountingEntry.find({ party: partyId }).sort('occurredAt').lean();
  let balance = party.openingBalance || 0;
  const ledger = entries.map((e) => {
    // Sales increase debtor receivable (+), purchases/expenses increase payable (-).
    const total = round2(e.amount + (e.taxAmount || 0));
    const delta = e.kind === 'sales' ? total : -total;
    balance = round2(balance + delta);
    return { ...e, delta, balance };
  });
  return { party, openingBalance: party.openingBalance || 0, ledger, closingBalance: balance };
}
