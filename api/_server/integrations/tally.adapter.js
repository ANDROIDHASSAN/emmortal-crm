import Papa from 'papaparse';

// Normalises Tally exports into voucher objects:
//   { kind, gst, amount, taxAmount, partyName, voucherNo, narration, occurredAt, tallyGuid }
// Supports CSV (recommended) and a lightweight Tally XML <VOUCHER> parse.

const KIND_MAP = { sales: 'sales', sale: 'sales', purchase: 'purchase', purc: 'purchase', expense: 'expense', payment: 'expense' };
const toKind = (v) => KIND_MAP[String(v || '').toLowerCase().trim()] || 'sales';
const toBool = (v) => ['1', 'true', 'yes', 'gst', 'y'].includes(String(v || '').toLowerCase().trim());

function fromCsv(text) {
  const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
  return parsed.data.map((row) => {
    const r = {};
    for (const [k, v] of Object.entries(row)) r[k.toLowerCase().trim()] = v;
    return {
      kind: toKind(r.kind || r.type || r.vouchertype),
      gst: toBool(r.gst),
      amount: Number(r.amount || r.value || 0),
      taxAmount: Number(r.tax || r.taxamount || 0),
      partyName: r.party || r.partyname || r.ledger || '',
      voucherNo: r.voucherno || r.voucher || r.vchno || '',
      narration: r.narration || r.remarks || '',
      occurredAt: r.date || r.occurredat || undefined,
      tallyGuid: r.guid || r.tallyguid || undefined,
    };
  });
}

export function fromXml(text) {
  const vouchers = [];
  const blocks = text.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
  const tag = (block, name) => { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? m[1].trim() : ''; };
  for (const b of blocks) {
    const amt = Number(tag(b, 'AMOUNT') || 0);
    vouchers.push({
      kind: toKind(tag(b, 'VOUCHERTYPENAME')),
      gst: /gst|igst|cgst|sgst/i.test(b),
      amount: Math.abs(amt),
      taxAmount: 0,
      partyName: tag(b, 'PARTYLEDGERNAME') || tag(b, 'PARTYNAME'),
      voucherNo: tag(b, 'VOUCHERNUMBER'),
      narration: tag(b, 'NARRATION'),
      occurredAt: tag(b, 'DATE'),
      tallyGuid: tag(b, 'GUID') || undefined,
    });
  }
  return vouchers;
}

export class ImportTallyAdapter {
  constructor({ fileBuffer, fileName }) { this.fileBuffer = fileBuffer; this.fileName = fileName || ''; }
  async fetchVouchers() {
    const text = this.fileBuffer.toString('utf8');
    return /^\s*</.test(text) || /\.xml$/i.test(this.fileName) ? fromXml(text) : fromCsv(text);
  }
}

const tallyDate = (d) => (d ? new Date(d).toISOString().slice(0, 10).replace(/-/g, '') : '');

// Live connector: POSTs a Day Book Export request to Tally's HTTP-XML gateway
// and maps the returned <VOUCHER> blocks. Tally must be running with the gateway
// enabled (Gateway of Tally → F1 → Advanced → Tally.NET / HTTP server on a port).
export class HttpTallyAdapter {
  constructor({ url, from, to }) { this.url = url; this.from = from; this.to = to; }

  buildRequest() {
    const sv = `${this.from ? `<SVFROMDATE>${tallyDate(this.from)}</SVFROMDATE>` : ''}${this.to ? `<SVTODATE>${tallyDate(this.to)}</SVTODATE>` : ''}`;
    return `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Day Book</REPORTNAME><STATICVARIABLES>${sv}<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
  }

  async fetchVouchers() {
    if (!this.url) throw new Error('TALLY_HTTP_URL not configured');
    const res = await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: this.buildRequest() });
    if (!res.ok) throw new Error(`Tally gateway responded ${res.status}`);
    const text = await res.text();
    return fromXml(text);
  }
}

export default ImportTallyAdapter;
