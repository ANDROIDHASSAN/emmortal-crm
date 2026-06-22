import { z } from 'zod';
import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/helpers.js';
import { createLeadFromEnquiry } from '../leads/leads.service.js';

export const enquirySchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(20).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  productInterest: z.string().max(160).optional().default(''),
  message: z.string().max(2000).optional().default(''),
  qty: z.coerce.number().min(1).max(100000).default(1),
  // Honeypot field — must be empty (bots fill it).
  company_website: z.string().optional().default(''),
});

export const publicProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ active: true })
    .select('name slug shortDesc specs priceFrom images category featured')
    .sort('-featured -createdAt')
    .lean();
  res.json({ data: products });
});

export const publicProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});

export const submitEnquiry = asyncHandler(async (req, res) => {
  // Honeypot anti-spam: if the hidden field is filled, silently accept (don't create).
  if (req.body.company_website) {
    return res.status(202).json({ data: { ok: true } });
  }
  const { company_website, ...payload } = req.body;
  const lead = await createLeadFromEnquiry({ ...payload, source: 'website' });
  res.status(201).json({ data: { ok: true, leadId: lead._id } });
});
