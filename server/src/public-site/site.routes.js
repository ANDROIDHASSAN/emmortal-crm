import { Router } from 'express';
import { Product } from '../models/Product.js';
import { Lead } from '../models/Lead.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/helpers.js';
import { createLeadFromEnquiry } from '../modules/leads/leads.service.js';

const router = Router();
const company = {
  name: 'E-mmortal Automotives Pvt. Ltd.',
  tagline: 'Custom lithium battery packs, engineered to order — MIDC Ambad, Nashik',
  phone: '+91-00000-00000',
  email: env.LEADS_NOTIFY_EMAIL || 'sales@emmortal.example.com',
  crmUrl: env.CRM_URL, // '/app/login' single-origin, or the Vercel URL when split
};

router.get('/', asyncHandler(async (req, res) => {
  const products = await Product.find({ active: true }).sort('-featured -createdAt').limit(6).lean();
  res.render('home', { company, products, baseUrl: env.PUBLIC_BASE_URL, seo: { title: `${company.name} — Custom Lithium Battery Packs`, description: 'Custom lithium battery packs built to order for EV, solar and industrial use. Tap Buy Now for a quote.', canonical: `${env.PUBLIC_BASE_URL}/` } });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const products = await Product.find({ active: true }).sort('-featured -createdAt').lean();
  res.render('catalogue', { company, products, baseUrl: env.PUBLIC_BASE_URL, seo: { title: `Battery Catalogue — ${company.name}`, description: 'Browse E-mmortal lithium battery packs by voltage, Ah and cell type.', canonical: `${env.PUBLIC_BASE_URL}/products` } });
}));

router.get('/products/:slug', asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
  if (!product) return next();
  res.render('product', { company, product, sent: false, baseUrl: env.PUBLIC_BASE_URL, seo: { title: product.seo?.title || `${product.name} — ${company.name}`, description: product.seo?.metaDescription || product.shortDesc || `${product.name} lithium battery pack.`, keywords: (product.seo?.keywords || []).join(', '), canonical: `${env.PUBLIC_BASE_URL}/products/${product.slug}` } });
}));

// Buy-Now form POST → lead (+ email), re-render the product page with a thank-you.
router.post('/products/:slug/enquiry', asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
  if (!product) return next();
  if (!req.body.company_website && req.body.name) {
    await createLeadFromEnquiry({ name: req.body.name, phone: req.body.phone || '', email: req.body.email || '', productInterest: product.name, message: req.body.message || '', qty: Number(req.body.qty || 1), source: 'website' });
  }
  res.render('product', { company, product, sent: true, baseUrl: env.PUBLIC_BASE_URL, seo: { title: `${product.name} — ${company.name}`, description: product.shortDesc || '', keywords: '', canonical: `${env.PUBLIC_BASE_URL}/products/${product.slug}` } });
}));

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api\nSitemap: ${env.PUBLIC_BASE_URL}/sitemap.xml\n`);
});

router.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const products = await Product.find({ active: true }).select('slug updatedAt').lean();
  const base = env.PUBLIC_BASE_URL;
  const urls = [{ loc: `${base}/`, priority: '1.0' }, { loc: `${base}/products`, priority: '0.8' }, ...products.map((p) => ({ loc: `${base}/products/${p.slug}`, lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined, priority: '0.7' }))];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
}));

export default router;
