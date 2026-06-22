import Papa from 'papaparse';
import { Lead } from '../../models/Lead.js';
import { env } from '../../config/env.js';
import { sendMail } from '../../utils/mailer.js';

// Create a lead and (for website enquiries) notify the owner by email.
export async function createLeadFromEnquiry(payload) {
  // Next boardOrder within the 'new' column.
  const last = await Lead.findOne({ status: 'new' }).sort('-boardOrder').lean();
  const boardOrder = (last?.boardOrder || 0) + 1;

  const lead = await Lead.create({
    name: payload.name,
    phone: payload.phone || '',
    email: payload.email || '',
    productInterest: payload.productInterest || '',
    message: payload.message || '',
    qty: payload.qty || 1,
    source: payload.source || 'website',
    status: 'new',
    value: payload.value || 0,
    boardOrder,
    history: [{ from: null, to: 'new', at: new Date() }],
  });

  // Fire owner email (best-effort; doesn't block lead creation).
  const to = env.LEADS_NOTIFY_EMAIL;
  if (to) {
    sendMail({
      to,
      subject: `New website enquiry: ${lead.name}${lead.productInterest ? ` — ${lead.productInterest}` : ''}`,
      html: `
        <h3>New Buy-Now enquiry</h3>
        <p><strong>Name:</strong> ${lead.name}</p>
        <p><strong>Phone:</strong> ${lead.phone || '-'}</p>
        <p><strong>Email:</strong> ${lead.email || '-'}</p>
        <p><strong>Product:</strong> ${lead.productInterest || '-'}</p>
        <p><strong>Qty:</strong> ${lead.qty}</p>
        <p><strong>Message:</strong> ${lead.message || '-'}</p>
        <hr/><p>Open the Leads board in the CRM to action this.</p>`,
    }).catch((e) => console.error('[leads] owner email failed', e.message));
  }

  return lead;
}

// Update status with history append. Returns updated lead.
export async function changeStatus(lead, newStatus, user) {
  if (newStatus && newStatus !== lead.status) {
    lead.history.push({ from: lead.status, to: newStatus, by: user?.id, at: new Date() });
    lead.status = newStatus;
  }
  return lead;
}

// Board grouped by status for Kanban.
export async function board() {
  const leads = await Lead.find().sort({ boardOrder: 1, createdAt: 1 }).lean();
  const columns = { new: [], in_progress: [], won: [], lost: [] };
  for (const l of leads) (columns[l.status] || (columns[l.status] = [])).push(l);
  return columns;
}

// CSV bulk import → leads with source=csv.
export async function importCsv(text) {
  const parsed = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
  const created = [];
  const errors = [];
  for (const row of parsed.data) {
    const lc = {};
    for (const [k, v] of Object.entries(row)) lc[k.toLowerCase().trim()] = v;
    if (!lc.name) {
      errors.push('Row missing name');
      continue;
    }
    try {
      const last = await Lead.findOne({ status: 'new' }).sort('-boardOrder').lean();
      const lead = await Lead.create({
        name: lc.name,
        phone: lc.phone || '',
        email: lc.email || '',
        productInterest: lc.productinterest || lc.product || '',
        message: lc.message || '',
        qty: Number(lc.qty || 1),
        value: Number(lc.value || 0),
        source: 'csv',
        status: 'new',
        boardOrder: (last?.boardOrder || 0) + 1,
        history: [{ from: null, to: 'new', at: new Date() }],
      });
      created.push(lead);
    } catch (e) {
      errors.push(e.message);
    }
  }
  return { created: created.length, errors };
}
