import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) {
    // No SMTP configured → use a JSON transport that logs instead of sending.
    // Keeps the app fully functional in dev / before SMTP is provisioned.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text, attachments }) {
  if (!to) return { skipped: true, reason: 'no recipient' };
  const info = await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    text,
    html,
    attachments,
  });
  if (!env.SMTP_HOST) {
    // eslint-disable-next-line no-console
    console.log(`[mail:dev] would send "${subject}" → ${to}`);
  }
  return info;
}

export default sendMail;
