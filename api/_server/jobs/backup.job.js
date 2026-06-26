import mongoose from 'mongoose';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { env } from '../config/env.js';
import { sendMail } from '../utils/mailer.js';
import { BackupLog } from '../models/BackupLog.js';

const gzip = promisify(zlib.gzip);

// Pure-JS logical export of all collections → gzipped JSON, emailed (no mongodump needed).
export async function runBackup({ triggeredBy } = {}) {
  const log = await BackupLog.create({ startedAt: new Date() });
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const dump = {}; let documents = 0;
    for (const c of collections) {
      const docs = await mongoose.connection.db.collection(c.name).find({}).toArray();
      dump[c.name] = docs; documents += docs.length;
    }
    const json = JSON.stringify(dump);
    const gz = await gzip(Buffer.from(json, 'utf8'));
    const fileName = `emmortal-backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
    const to = env.BACKUP_NOTIFY_EMAIL || env.LEADS_NOTIFY_EMAIL;
    if (to) await sendMail({ to, subject: `E-mmortal CRM backup — ${documents} documents`, html: `<p>Monthly database backup attached (${collections.length} collections, ${documents} documents).</p>`, attachments: [{ filename: fileName, content: gz }] });
    Object.assign(log, { finishedAt: new Date(), fileName, sizeBytes: gz.length, collections: collections.length, documents, emailedTo: to || '', status: 'success' });
    await log.save();
    return log.toObject();
  } catch (err) {
    Object.assign(log, { finishedAt: new Date(), status: 'failed', error: err.message });
    await log.save();
    throw err;
  }
}

export default runBackup;
