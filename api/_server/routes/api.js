import { Router } from 'express';
import systemRoutes from '../modules/system/system.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import reworkRoutes from '../modules/rework/rework.routes.js';
import accountingRoutes from '../modules/accounting/accounting.routes.js';
import productionRoutes from '../modules/production/production.routes.js';
import hrRoutes from '../modules/hr/hr.routes.js';
import productRoutes from '../modules/products/products.routes.js';
import leadRoutes from '../modules/leads/leads.routes.js';
import publicRoutes from '../modules/public/public.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';

const api = Router();

api.use('/', systemRoutes);        // /health, /backup
api.use('/auth', authRoutes);
api.use('/', inventoryRoutes);     // /items, /stock-movements, /inventory
api.use('/', reworkRoutes);        // /batteries, /rework
api.use('/accounting', accountingRoutes);
api.use('/production', productionRoutes);
api.use('/', hrRoutes);            // /employees, /attendance, /hr
api.use('/', productRoutes);       // /products
api.use('/leads', leadRoutes);
api.use('/public', publicRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/notifications', notificationRoutes);

export default api;
