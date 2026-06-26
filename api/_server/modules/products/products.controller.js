import { z } from 'zod';
import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope, escapeRegex } from '../../utils/helpers.js';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const productSchema = z.object({
  name: z.string().min(1), slug: z.string().optional(), shortDesc: z.string().optional().default(''), longDesc: z.string().optional().default(''),
  category: z.string().optional().default('general'), priceFrom: z.coerce.number().min(0).default(0),
  specs: z.object({ cell: z.string().optional(), bms: z.string().optional(), voltage: z.coerce.number().optional(), ah: z.coerce.number().optional(), sizeMm: z.string().optional() }).optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional(),
  applications: z.array(z.string()).optional(),
  seo: z.object({ title: z.string().optional(), metaDescription: z.string().optional(), keywords: z.array(z.string()).optional() }).optional(),
  active: z.boolean().optional(), featured: z.boolean().optional(),
});
export const productUpdateSchema = productSchema.partial();

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, sort, q, skip } = parseListQuery(req.query, { defaultSort: '-featured -createdAt' });
  const filter = {};
  if (q) filter.name = new RegExp(escapeRegex(q), 'i');
  const [data, total] = await Promise.all([Product.find(filter).sort(sort).skip(skip).limit(limit).lean(), Product.countDocuments(filter)]);
  res.json(listEnvelope(data, total, page, limit));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
  if (await Product.findOne({ slug })) throw ApiError.conflict('Slug already in use');
  res.status(201).json({ data: await Product.create({ ...req.body, slug }) });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.slug) body.slug = slugify(body.slug);
  const product = await Product.findByIdAndUpdate(req.params.id, body, { new: true });
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});
