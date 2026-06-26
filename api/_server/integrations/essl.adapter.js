import Papa from 'papaparse';

// Parses eSSL device exports into punches: { esslUserId, ts }.
// Handles tab/comma .dat/.csv where each line has a device user id and a datetime.
export class ImportEsslAdapter {
  constructor({ fileBuffer, fileName }) { this.fileBuffer = fileBuffer; this.fileName = fileName || ''; }

  async fetchPunches() {
    const text = this.fileBuffer.toString('utf8').trim();
    const punches = [];

    // Try CSV with headers first.
    if (/userid|user_id|empid|date|time/i.test(text.split('\n')[0])) {
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      for (const row of parsed.data) {
        const r = {}; for (const [k, v] of Object.entries(row)) r[k.toLowerCase().replace(/\s+/g, '')] = v;
        const id = r.userid || r.user_id || r.empid || r.id;
        const dt = r.datetime || `${r.date || ''} ${r.time || ''}`.trim();
        if (id && dt) { const ts = new Date(dt); if (!Number.isNaN(ts.getTime())) punches.push({ esslUserId: String(id).trim(), ts }); }
      }
      return punches;
    }

    // Fallback: whitespace/tab-delimited .dat — first token = id, rest = datetime.
    for (const line of text.split('\n')) {
      const parts = line.trim().split(/[\t,]|\s{2,}/).filter(Boolean);
      if (parts.length < 2) continue;
      const id = parts[0];
      const ts = new Date(parts.slice(1).join(' '));
      if (id && !Number.isNaN(ts.getTime())) punches.push({ esslUserId: String(id).trim(), ts });
    }
    return punches;
  }
}

// Normalises a real-time eSSL Push-SDK payload into punches [{ esslUserId, ts }].
// Accepts a single object or an array; tolerant of common field names.
export function parsePushPayload(body) {
  const rows = Array.isArray(body) ? body : (body.records || body.data || body.punches || [body]);
  const punches = [];
  for (const r of rows) {
    const id = r.esslUserId || r.userId || r.user_id || r.empId || r.EnrollNumber || r.pin;
    const dt = r.ts || r.time || r.datetime || r.punchTime || r.LogTime || `${r.date || ''} ${r.time || ''}`.trim();
    if (!id || !dt) continue;
    const ts = new Date(dt);
    if (!Number.isNaN(ts.getTime())) punches.push({ esslUserId: String(id).trim(), ts });
  }
  return punches;
}

export default ImportEsslAdapter;
