import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { publicProducts, publicProductBySlug, submitEnquiry, enquirySchema } from './public.controller.js';

const router = Router();

// Public, unauthenticated endpoints (storefront data + Buy-Now enquiry).
const enquiryLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, standardHeaders: true });

router.get('/products', publicProducts);
router.get('/products/:slug', publicProductBySlug);
router.post('/enquiry', enquiryLimiter, validate({ body: enquirySchema }), submitEnquiry);

export default router;
