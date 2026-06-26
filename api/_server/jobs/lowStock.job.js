import { env } from '../config/env.js';
import { sendMail } from '../utils/mailer.js';
import { lowStockItems } from '../modules/inventory/inventory.service.js';

export async function lowStockNotify() {
  const items = await lowStockItems();
  if (!items.length) return { count: 0 };
  const to = env.LEADS_NOTIFY_EMAIL || env.BACKUP_NOTIFY_EMAIL;
  if (to) {
    const rows = items.map((i) => `<tr><td>${i.name}</td><td>${i.sku || ''}</td><td>${i.qtyOnHand}</td><td>${i.reorderLevel}</td></tr>`).join('');
    await sendMail({ to, subject: `Low-stock alert: ${items.length} item(s) need reordering`, html: `<h3>Low stock</h3><table border="1" cellpadding="6"><tr><th>Item</th><th>SKU</th><th>On hand</th><th>Reorder</th></tr>${rows}</table>` });
  }
  return { count: items.length };
}

export default lowStockNotify;
