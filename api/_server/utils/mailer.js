import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  // No SMTP configured → JSON transport that logs instead of sending (dev-safe).
  transporter = env.SMTP_HOST
    ? nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined })
    : nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

export async function sendMail({ to, subject, html, text, attachments }) {
  if (!to) return { skipped: true };
  const info = await getTransporter().sendMail({ from: env.MAIL_FROM, to, subject, text, html, attachments });
  if (!env.SMTP_HOST) console.log(`[mail:dev] "${subject}" → ${to}`);
  return info;
}

export default sendMail;
