import { Router } from 'express';
import { authMiddleware } from '../../../core/middleware/auth.middleware.js';
import { roleMiddleware } from '../../../core/middleware/role.middleware.js';
import {
  getDiscounts,
  patchDiscountStatus,
  postDiscount,
  putDiscount,
} from '../controllers/discounts.controller.js';

const router = Router();

router.get('/admin', authMiddleware, roleMiddleware(['Administrador']), getDiscounts);
router.post('/admin', authMiddleware, roleMiddleware(['Administrador']), postDiscount);
router.put('/admin/:id', authMiddleware, roleMiddleware(['Administrador']), putDiscount);
router.patch('/admin/:id/toggle-status', authMiddleware, roleMiddleware(['Administrador']), patchDiscountStatus);

export default router;
