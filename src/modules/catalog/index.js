import express from 'express';
import publicRoutes from './public/routes/catalog.routes.js';
import adminRoutes from './admin/routes/catalog.admin.routes.js';

const router = express.Router();

router.use('/', publicRoutes);
router.use('/admin', adminRoutes);

export default router;
