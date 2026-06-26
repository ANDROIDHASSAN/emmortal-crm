import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { listProducts, getProduct, createProduct, updateProduct, productSchema, productUpdateSchema } from './products.controller.js';

const router = Router();
const write = rbac('admin', 'manager');

router.get('/products', requireAuth, listProducts);
router.post('/products', requireAuth, write, validate({ body: productSchema }), createProduct);
router.get('/products/:id', requireAuth, getProduct);
router.patch('/products/:id', requireAuth, write, validate({ body: productUpdateSchema }), updateProduct);

export default router;
