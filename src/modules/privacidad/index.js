import express from 'express';
import publicRoutes from './public/routes/privacidad.routes.js';
import adminRoutes  from './admin/routes/admin.privacidad.routes.js';

const router = express.Router();

router.use('/',      publicRoutes);
router.use('/admin', adminRoutes);

export default router;