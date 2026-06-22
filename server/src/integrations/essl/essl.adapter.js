import Papa from 'papaparse';

/**
 * EsslAdapter interface: fetchPunches({ from, to }) -> { esslUserId, ts, direction }[]
 *
 * import mode: parse a device export (.dat / .csv). eSSL .dat is a fixed/tab layout:
 *   userId   yyyy-mm-dd HH:MM:SS   ...   (direction optional)
 * We detect either a CSV with headers or a whitespace/tab-delimited .dat dump.
 */

function parseDatLine(line) {
  // Common eSSL .dat: "<userid>\t<datetime>\t<state>..." OR space-separated.
  const parts = line.trim().split(/\t|\s{2,}|,/).filter(Boolean);
  if (parts.length < 2) return null;
  const userId = parts[0];
  // Find a datetime token among the remaining parts.
  const rest = parts.slice(1).join(' ');
  const m = rest.match(/\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}(:\d{2})?/);
  if (!m) return null;
  return { esslUserId: String(userId), ts: new Date(m[0].replace(/\//g, '-')), direction: '' };
}

export class ImportEsslAdapter {
  constructor({ fileBuffer, fileName = '' }) {
    this.fileBuffer = fileBuffer;
    this.fileName = fileName;
  }
  async fetchPunches() {
    const text = this.fileBuffer.toString('utf8');
    const looksCsv = /[,;]/.test(text.split('\n')[0]) && /user|emp|date|time|punch/i.test(text.split('\n')[0]);
    if (looksCsv) {
      const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
      return parsed.data
        .map((row) => {
          const lc = {};
          for (const [k, v] of Object.entries(row)) lc[k.toLowerCase().trim()] = v;
          const userId = lc.userid || lc.user || lc.empid || lc.esslid || lc.id;
          const dt = lc.datetime || `${lc.date || ''} ${lc.time || ''}`.trim();
          if (!userId || !dt) return null;
          return { esslUserId: String(userId), ts: new Date(dt.replace(/\//g, '-')), direction: lc.direction || lc.state || '' };
        })
        .filter(Boolean);
    }
    return text
      .split(/\r?\n/)
      .map(parseDatLine)
      .filter(Boolean);
  }
}

// Push mode receiver (eSSL Push SDK posts punches). Stubbed + documented.
export function parsePushPayload(body) {
  // eSSL push typically posts records like: SN=...&Stamp=...&table=ATTLOG with a body of
  // tab-separated rows: "userid\tdatetime\tstatus\tverify\t..."
  const records = String(body || '')
    .split(/\r?\n/)
    .map(parseDatLine)
    .filter(Boolean);
  return records;
}

export default ImportEsslAdapter;
