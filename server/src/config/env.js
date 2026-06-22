import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env (monorepo) then allow server/.env to override.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  PORT: num(process.env.PORT, 3000),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/emmortal_crm',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  ACCESS_TTL: process.env.ACCESS_TTL || '15m',
  REFRESH_TTL: process.env.REFRESH_TTL || '7d',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: num(process.env.SMTP_PORT, 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'no-reply@emmortal.local',
  LEADS_NOTIFY_EMAIL: process.env.LEADS_NOTIFY_EMAIL || '',
  BACKUP_NOTIFY_EMAIL: process.env.BACKUP_NOTIFY_EMAIL || '',

  TALLY_SYNC_MODE: process.env.TALLY_SYNC_MODE || 'import',
  TALLY_HTTP_URL: process.env.TALLY_HTTP_URL || '',
  ESSL_SYNC_MODE: process.env.ESSL_SYNC_MODE || 'import',

  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',

  SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME || 'Admin',
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@emmortal.local',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
};

export default env;
