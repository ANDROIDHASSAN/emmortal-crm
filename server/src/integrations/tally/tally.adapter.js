import Papa from 'papaparse';

/**
 * TallyAdapter interface:
 *   fetchVouchers({ from, to }) -> AccountingEntry-shaped[]
 *
 * Two concrete adapters:
 *   - ImportTallyAdapter: parses an uploaded Tally export (XML or CSV)
 *   - HttpTallyAdapter:   POSTs a Tally XML request to TALLY_HTTP_URL (same-network only)
 *
 * Both normalize to: { kind, gst, amount, taxAmount, partyName, voucherNo, narration, occurredAt, tallyGuid }
 */

const KIND_MAP = {
  sales: 'sales',
  sale: 'sales',
  purchase: 'purchase',
  purc: 'purchase',
  expense: 'expense',
  payment: 'expense',
};

function normalizeKind(raw = '') {
  const k = String(raw).toLowerCase().trim();
  if (KIND_MAP[k]) return KIND_MAP[k];
  if (k.includes('sale')) return 'sales';
  if (k.includes('purch')) return 'purchase';
  return 'expense';
}

function toBool(v) {
  const s = String(v ?? '').toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === '1' || s === 'gst';
}

// --- CSV import ---------------------------------------------------------------
// Expected headers (case-insensitive): guid, date, kind/vouchertype, gst, party,
// amount, tax, voucherno, narration
export function parseTallyCsv(text) {
  const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
  return parsed.data.map((row) => {
    const lc = {};
    for (const [k, v] of Object.entries(row)) lc[k.toLowerCase().trim()] = v;
    return {
      tallyGuid: lc.guid || lc.tallyguid || undefined,
      occurredAt: new Date(lc.date || lc.occurredat || Date.now()),
      kind: normalizeKind(lc.kind || lc.vouchertype || lc.type),
      gst: toBool(lc.gst),
      partyName: lc.party || lc.partyname || '',
      amount: Number(lc.amount || 0),
      taxAmount: Number(lc.tax || lc.taxamount || 0),
      voucherNo: lc.voucherno || lc.voucher || '',
      narration: lc.narration || lc.notes || '',
    };
  });
}

// --- XML import (Tally daybook export) ---------------------------------------
// Lightweight regex-based extraction of <VOUCHER> blocks — avoids a heavy XML dep
// and tolerates Tally's loose XML. Good enough for the standard daybook export.
export function parseTallyXml(xml) {
  const vouchers = [];
  const blocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
  const get = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? m[1].trim() : '';
  };
  for (const b of blocks) {
    const guidAttr = b.match(/REMOTEID="([^"]+)"/i) || b.match(/GUID[^>]*>([\s\S]*?)</i);
    const amountRaw = get(b, 'AMOUNT') || get(b, 'LEDGERAMOUNT') || '0';
    const dateRaw = get(b, 'DATE');
    const date = dateRaw.length === 8 ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}` : dateRaw;
    vouchers.push({
      tallyGuid: (guidAttr && guidAttr[1]) || get(b, 'GUID') || undefined,
      occurredAt: new Date(date || Date.now()),
      kind: normalizeKind(get(b, 'VOUCHERTYPENAME')),
      gst: /gst|igst|cgst|sgst/i.test(b),
      partyName: get(b, 'PARTYLEDGERNAME') || get(b, 'PARTYNAME') || '',
      amount: Math.abs(Number(amountRaw.replace(/[^0-9.-]/g, '')) || 0),
      taxAmount: 0,
      voucherNo: get(b, 'VOUCHERNUMBER'),
      narration: get(b, 'NARRATION'),
    });
  }
  return vouchers;
}

export class ImportTallyAdapter {
  constructor({ fileBuffer, fileName = '' }) {
    this.fileBuffer = fileBuffer;
    this.fileName = fileName;
  }
  async fetchVouchers() {
    const text = this.fileBuffer.toString('utf8');
    const isXml = this.fileName.toLowerCase().endsWith('.xml') || text.trim().startsWith('<');
    return isXml ? parseTallyXml(text) : parseTallyCsv(text);
  }
}

export class HttpTallyAdapter {
  constructor({ url, from, to }) {
    this.url = url;
    this.from = from;
    this.to = to;
  }
  async fetchVouchers() {
    // Tally XML/HTTP export request. Requires Tally reachable from the server (same network).
    const body = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Day Book</REPORTNAME></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
    const resp = await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body });
    const xml = await resp.text();
    return parseTallyXml(xml);
  }
}

export default ImportTallyAdapter;
