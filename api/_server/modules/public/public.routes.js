import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { listPublicProducts, getPublicProduct, submitEnquiry, enquirySchema } from './public.controller.js';

const router = Router();
const enquiryLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true });

router.get('/products', listPublicProducts);
router.get('/products/:slug', getPublicProduct);
router.post('/enquiry', enquiryLimiter, validate({ body: enquirySchema }), submitEnquiry);

export default router;
