import express from 'express';
import publicRoutes from './public/routes/terminos.router.js';
import adminRoutes  from './admin/routes/admin.terminos.routes.js';

const router = express.Router();

router.use('/',      publicRoutes);
router.use('/admin', adminRoutes);

export default router;