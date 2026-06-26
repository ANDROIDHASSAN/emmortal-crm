import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { rbac } from '../../middleware/rbac.js';
import { listItems, getItem, createItem, updateItem, lowStock, summary, createMovement, listMovements, itemSchema, itemUpdateSchema, movementSchema } from './inventory.controller.js';

const router = Router();
const write = rbac('admin', 'manager', 'staff');

router.get('/items/low-stock', requireAuth, lowStock);
router.get('/inventory/summary', requireAuth, summary);
router.get('/items', requireAuth, listItems);
router.post('/items', requireAuth, write, validate({ body: itemSchema }), createItem);
router.get('/items/:id', requireAuth, getItem);
router.patch('/items/:id', requireAuth, write, validate({ body: itemUpdateSchema }), updateItem);
router.get('/stock-movements', requireAuth, listMovements);
router.post('/stock-movements', requireAuth, write, validate({ body: movementSchema }), createMovement);

export default router;
