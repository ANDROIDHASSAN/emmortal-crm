import mongoose from 'mongoose';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { env } from '../config/env.js';
import { BackupLog } from '../models/BackupLog.js';
import { sendMail } from '../utils/mailer.js';

const gzip = promisify(zlib.gzip);

// Pure-JS logical export of every collection → single JSON → gzip → email attachment.
// Avoids depending on the mongodump binary (not available on shared hosting).
export async function runBackup({ triggeredBy } = {}) {
  const log = await BackupLog.create({ startedAt: new Date(), status: 'running' });
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const dump = {};
    let docCount = 0;
    for (const c of collections) {
      const docs = await db.collection(c.name).find({}).toArray();
      dump[c.name] = docs;
      docCount += docs.length;
    }
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), data: dump });
    const gzipped = await gzip(Buffer.from(json, 'utf8'));
    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `emmortal-backup-${stamp}.json.gz`;

    const to = env.BACKUP_NOTIFY_EMAIL;
    if (to) {
      await sendMail({
        to,
        subject: `E-mmortal CRM monthly backup — ${stamp}`,
        text: `Attached is the database backup (${collections.length} collections, ${docCount} documents).`,
        attachments: [{ filename: fileName, content: gzipped }],
      });
    }

    log.finishedAt = new Date();
    log.fileName = fileName;
    log.sizeBytes = gzipped.length;
    log.collections = collections.length;
    log.documents = docCount;
    log.emailedTo = to || '(no BACKUP_NOTIFY_EMAIL set)';
    log.status = 'success';
    await log.save();
    return log.toObject();
  } catch (err) {
    log.finishedAt = new Date();
    log.status = 'failed';
    log.error = err.message;
    await log.save();
    throw err;
  }
}

export default runBackup;
