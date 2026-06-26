import { z } from 'zod';
import { Product } from '../../models/Product.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/helpers.js';
import { createLeadFromEnquiry } from '../leads/leads.service.js';

export const enquirySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  productInterest: z.string().optional().default(''),
  message: z.string().optional().default(''),
  qty: z.coerce.number().min(1).default(1),
  company_website: z.string().optional(), // honeypot
});

export const listPublicProducts = asyncHandler(async (req, res) => {
  res.json({ data: await Product.find({ active: true }).sort('-featured -createdAt').lean() });
});

export const getPublicProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, active: true }).lean();
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ data: product });
});

// Buy-Now form → lead (+ owner email). Honeypot blocks bots silently.
export const submitEnquiry = asyncHandler(async (req, res) => {
  if (req.body.company_website) return res.status(201).json({ data: { ok: true } });
  const lead = await createLeadFromEnquiry({ ...req.body, source: 'website' });
  res.status(201).json({ data: { ok: true, id: lead._id } });
});
