import { Router } from 'express';
import {
  createPaymentPreference,
  mercadoPagoWebhook,
} from '../controllers/payments.controller.js';
import {
  getAdminPaymentStats,
  getAdminPurchases,
} from '../controllers/payments.admin.controller.js';
import { authMiddleware } from '../../../core/middleware/auth.middleware.js';
import { roleMiddleware } from '../../../core/middleware/role.middleware.js';
const router = Router();

router.post('/create-preference', authMiddleware, createPaymentPreference);
router.post('/webhook', mercadoPagoWebhook);
router.get('/admin/purchases', authMiddleware, roleMiddleware(['Administrador']), getAdminPurchases);
router.get('/admin/stats', authMiddleware, roleMiddleware(['Administrador']), getAdminPaymentStats);
export default router;
