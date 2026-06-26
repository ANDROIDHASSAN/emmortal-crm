import Papa from 'papaparse';
import { Lead } from '../../models/Lead.js';
import { env } from '../../config/env.js';
import { sendMail } from '../../utils/mailer.js';
import { notify } from '../notifications/notification.service.js';

export const LEAD_STATUSES = ['new', 'contacted', 'quotation', 'negotiation', 'won', 'lost'];

// Create a lead (website Buy-Now or manual) and email the owner for website ones.
export async function createLeadFromEnquiry(payload) {
  const last = await Lead.findOne({ status: 'new' }).sort('-boardOrder').lean();
  const lead = await Lead.create({
    name: payload.name, phone: payload.phone || '', email: payload.email || '',
    productInterest: payload.productInterest || '', message: payload.message || '',
    qty: payload.qty || 1, value: payload.value || 0, source: payload.source || 'website',
    status: 'new', boardOrder: (last?.boardOrder || 0) + 1, history: [{ from: null, to: 'new', at: new Date() }],
  });

  // In-app notification for the team (website leads especially).
  await notify({ title: `New ${lead.source} lead: ${lead.name}`, message: `${lead.productInterest || 'General enquiry'}${lead.phone ? ' · ' + lead.phone : ''}`, category: 'lead', roles: ['admin', 'manager', 'staff'], entity: 'Lead', entityId: lead._id });

  if (payload.source === 'website' && env.LEADS_NOTIFY_EMAIL) {
    sendMail({
      to: env.LEADS_NOTIFY_EMAIL,
      subject: `New website enquiry: ${lead.name}${lead.productInterest ? ` — ${lead.productInterest}` : ''}`,
      html: `<h3>New Buy-Now enquiry</h3><p><b>Name:</b> ${lead.name}</p><p><b>Phone:</b> ${lead.phone || '-'}</p><p><b>Email:</b> ${lead.email || '-'}</p><p><b>Product:</b> ${lead.productInterest || '-'}</p><p><b>Qty:</b> ${lead.qty}</p><p><b>Message:</b> ${lead.message || '-'}</p>`,
    }).catch((e) => console.error('[leads] owner email failed', e.message));
  }
  return lead;
}

export function changeStatus(lead, newStatus, user) {
  if (newStatus && newStatus !== lead.status) {
    lead.history.push({ from: lead.status, to: newStatus, by: user?.id, at: new Date() });
    lead.status = newStatus;
  }
  return lead;
}

export async function board() {
  const leads = await Lead.find().populate('owner', 'name').sort({ boardOrder: 1, createdAt: 1 }).lean();
  const columns = {}; for (const s of LEAD_STATUSES) columns[s] = [];
  for (const l of leads) (columns[l.status] || (columns[l.status] = [])).push(l);
  return columns;
}

export async function importCsv(text) {
  const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
  const seen = new Set(); let created = 0; const errors = [];
  for (const row of parsed.data) {
    const lc = {}; for (const [k, v] of Object.entries(row)) lc[k.toLowerCase().trim()] = v;
    if (!lc.name) { errors.push('Row missing name'); continue; }
    const dedupeKey = `${(lc.phone || '').trim()}|${(lc.email || '').toLowerCase().trim()}`;
    if (dedupeKey !== '|') {
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      if (await Lead.findOne({ $or: [lc.phone ? { phone: lc.phone } : null, lc.email ? { email: lc.email.toLowerCase() } : null].filter(Boolean) })) continue;
    }
    try {
      const last = await Lead.findOne({ status: 'new' }).sort('-boardOrder').lean();
      await Lead.create({ name: lc.name, phone: lc.phone || '', email: lc.email || '', productInterest: lc.productinterest || lc.product || '', message: lc.message || '', qty: Number(lc.qty || 1), value: Number(lc.value || 0), source: 'csv', status: 'new', boardOrder: (last?.boardOrder || 0) + 1, history: [{ from: null, to: 'new', at: new Date() }] });
      created += 1;
    } catch (e) { errors.push(e.message); }
  }
  return { created, errors };
}
