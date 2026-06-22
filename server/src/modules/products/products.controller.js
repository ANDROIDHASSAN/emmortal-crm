import { z } from 'zod';
import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';
import { writeAudit } from '../../utils/audit.js';

const slugify = (s) =>
  s.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  shortDesc: z.string().optional().default(''),
  longDesc: z.string().optional().default(''),
  specs: z
    .object({
      cell: z.string().optional(),
      bms: z.string().optional(),
      voltage: z.coerce.number().optional(),
      ah: z.coerce.number().optional(),
      sizeMm: z.string().optional(),
    })
    .optional(),
  priceFrom: z.coerce.number().min(0).default(0),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional(),
  category: z.string().optional().default('general'),
  seo: z
    .object({
      title: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
});

export const productUpdateSchema = productSchema.partial();

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query, { defaultSort: '-createdAt' });
  const filter = {};
  if (q) filter.name = new RegExp(escapeRegex(q), 'i');
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const [data, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json(listEnvelope(data, total, page, limit));
});

export const createProduct = asyncHandler(async (req, res) => {
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
  const exists = await Product.findOne({ slug });
  if (exists) throw ApiError.conflict('Slug already exists');
  const product = await Product.create({ ...req.body, slug });
  await writeAudit({ user: req.user, action: 'create', entity: 'Product', entityId: product._id, after: product.toObject() });
  res.status(201).json({ data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  if (req.body.slug) req.body.slug = slugify(req.body.slug);
  Object.assign(product, req.body);
  await product.save();
  res.json({ data: product });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});
