import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load the root .env for local dev. On Vercel/Render, env vars come from the
// platform (process.env), so a missing file here is fine.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  PORT: num(process.env.PORT, 3000),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/emmortal_crm',
  DNS_SERVERS: process.env.DNS_SERVERS || '',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  ACCESS_TTL: process.env.ACCESS_TTL || '15m',
  REFRESH_TTL: process.env.REFRESH_TTL || '7d',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: num(process.env.SMTP_PORT, 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'no-reply@emmortal.local',
  LEADS_NOTIFY_EMAIL: process.env.LEADS_NOTIFY_EMAIL || '',
  BACKUP_NOTIFY_EMAIL: process.env.BACKUP_NOTIFY_EMAIL || '',

  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',
  // The deployed frontend origin(s) allowed by CORS (comma-separated), e.g.
  // https://emmortal.vercel.app . And where the website's "CRM Login" should go.
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '',
  CRM_URL: process.env.CRM_URL || '/app/login',

  // Tally HTTP-XML gateway (Gateway of Tally → F1 → Advanced Config → enable).
  TALLY_HTTP_URL: process.env.TALLY_HTTP_URL || '', // e.g. http://192.168.1.10:9000
  TALLY_SYNC_MODE: process.env.TALLY_SYNC_MODE || 'import', // 'import' (upload) | 'http'

  // Shared secret the eSSL device sends with push payloads.
  ESSL_PUSH_TOKEN: process.env.ESSL_PUSH_TOKEN || '',

  SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME || 'Admin',
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@emmortal.local',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
};

export default env;
