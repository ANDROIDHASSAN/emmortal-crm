import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import {
  listProducts,
  createProduct,
  updateProduct,
  getProduct,
  productSchema,
  productUpdateSchema,
} from './products.controller.js';

const router = Router();
const writeRoles = rbac('admin', 'manager', 'staff');

router.get('/products', requireAuth, listProducts);
router.post('/products', requireAuth, writeRoles, validate({ body: productSchema }), createProduct);
router.get('/products/:id', requireAuth, getProduct);
router.patch('/products/:id', requireAuth, writeRoles, validate({ body: productUpdateSchema }), updateProduct);

export default router;
