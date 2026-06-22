import { Router } from 'express';
import { Product } from '../models/Product.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/helpers.js';

const router = Router();

const company = {
  name: 'E-mmortal Automotives Pvt. Ltd.',
  tagline: 'Custom lithium battery packs, engineered to order — Nashik, India',
  phone: '+91-00000-00000',
  email: env.LEADS_NOTIFY_EMAIL || 'sales@emmortal.example.com',
};

// Home
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const products = await Product.find({ active: true }).sort('-featured -createdAt').limit(6).lean();
    res.render('home', {
      company,
      products,
      baseUrl: env.PUBLIC_BASE_URL,
      seo: {
        title: `${company.name} — Custom Lithium Battery Packs`,
        description: 'E-mmortal builds custom lithium battery packs to order: EV, solar OEM and LiFePO4 packs. Get a quote today.',
        canonical: env.PUBLIC_BASE_URL + '/',
      },
    });
  })
);

// Catalogue
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const products = await Product.find({ active: true }).sort('-featured -createdAt').lean();
    res.render('catalogue', {
      company,
      products,
      baseUrl: env.PUBLIC_BASE_URL,
      seo: {
        title: `Battery Catalogue — ${company.name}`,
        description: 'Browse E-mmortal lithium battery packs: voltage, Ah and cell options for EV, solar and industrial use.',
        canonical: env.PUBLIC_BASE_URL + '/products',
      },
    });
  })
);

// Product detail (PDP) with Buy-Now + JSON-LD
router.get(
  '/products/:slug',
  asyncHandler(async (req, res, next) => {
    const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
    if (!product) return next(); // fall through to 404
    const seoTitle = product.seo?.title || `${product.name} — ${company.name}`;
    const seoDesc = product.seo?.metaDescription || product.shortDesc || `${product.name} lithium battery pack by ${company.name}.`;
    res.render('product', {
      company,
      product,
      baseUrl: env.PUBLIC_BASE_URL,
      seo: {
        title: seoTitle,
        description: seoDesc,
        keywords: (product.seo?.keywords || []).join(', '),
        canonical: `${env.PUBLIC_BASE_URL}/products/${product.slug}`,
      },
    });
  })
);

// robots.txt
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api\nSitemap: ${env.PUBLIC_BASE_URL}/sitemap.xml\n`
  );
});

// Dynamic sitemap.xml from active product slugs + static pages
router.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    const products = await Product.find({ active: true }).select('slug updatedAt').lean();
    const base = env.PUBLIC_BASE_URL;
    const urls = [
      { loc: `${base}/`, priority: '1.0' },
      { loc: `${base}/products`, priority: '0.8' },
      ...products.map((p) => ({
        loc: `${base}/products/${p.slug}`,
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
        priority: '0.7',
      })),
    ];
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
        )
        .join('\n') +
      `\n</urlset>`;
    res.type('application/xml').send(xml);
  })
);

export default router;
