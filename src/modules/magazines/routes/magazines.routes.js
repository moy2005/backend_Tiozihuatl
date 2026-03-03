import { Router } from 'express';
import * as controller from '../controllers/magazines.controller.js';
import { authMiddleware } from '../../../core/middleware/auth.middleware.js';
import { roleMiddleware } from '../../../core/middleware/role.middleware.js';
import { upload } from '../../../config/multer.config.js';

const router = Router();
console.log("Controller keys:", Object.keys(controller));
/* =========================
   PUBLIC
========================= */
router.get(
  '/admin',
  authMiddleware,
  roleMiddleware(['Administrador']),
  controller.getAllMagazines
);
router.get('/', controller.getCatalog);

router.get(
  '/secure-pdf/:id',
  authMiddleware,
  controller.getSecurePdf
);
/* =========================
   USER
========================= */
router.get('/my-purchases', authMiddleware,controller.getMyPurchases);
router.get('/:id/view', authMiddleware, controller.viewMagazine);
router.get('/:id', controller.getMagazineById);

router.post('/progress', authMiddleware, controller.saveProgress);
router.put(
  '/admin/:id',
  authMiddleware,
  roleMiddleware(['Administrador']),
  upload.fields([
    { name: 'pdf', maxCount: 1 }
  ]),
  controller.updateMagazine
);


//router.get('/progress/:id', authMiddleware, controller.getProgress);

/* =========================
   ADMIN
========================= */

// Subir revista
router.post(
  '/admin/upload',
  authMiddleware,
  roleMiddleware(['Administrador']),
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'portada', maxCount: 1 }
  ]),
  controller.uploadMagazine
);

// Actualizar revista
router.put(
  '/admin/:id',
  authMiddleware,
  roleMiddleware(['Administrador']),
  upload.fields([
    { name: 'pdf', maxCount: 1 }
  ]),
  controller.updateMagazine
);

// Desactivar revista

router.patch(
  "/admin/:id/toggle-status",
  authMiddleware,
  roleMiddleware(['Administrador']),
  controller.toggleMagazineStatus
);
// Completar compra
router.post(
  '/complete-purchase',
  authMiddleware,
  controller.completePurchase
);

// Auditoría de compras
router.get(
  '/admin/auditoria-compras',
  authMiddleware,
  roleMiddleware(['Administrador']),
  controller.getAuditoriaCompras
);
router.get('/test', (req, res) => {
  res.json({ ok: true });
});
export default router;
