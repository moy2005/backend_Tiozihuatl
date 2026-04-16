import { Router } from 'express';
import * as controller from '../controllers/magazines.controller.js';
import { authMiddleware } from '../../../core/middleware/auth.middleware.js';
import { roleMiddleware } from '../../../core/middleware/role.middleware.js';
import { upload } from '../../../config/multer.config.js';

const router = Router();
/* =========================
   PUBLIC
========================= */

// Catálogo general de revistas
router.get('/', controller.getCatalog);
// Filtrar revistas por búsqueda, orden o letra
router.get('/filter', controller.filterMagazines);


/* =========================
   USER
========================= */
// Ver mis compras
router.get('/my-purchases', authMiddleware,controller.getMyPurchases);
// Obtener URL segura del PDF
router.get('/secure-pdf/:id',authMiddleware,controller.getSecurePdf);
/*router.get('/secure-pdf/:id', authMiddleware, controller.viewMagazine);*/
// Completar compra
router.post('/complete-purchase',authMiddleware,controller.completePurchase);
// Guardar progreso de lectura
router.post('/progress', authMiddleware, controller.saveProgress);
router.get('/progress/:id', authMiddleware, controller.getProgress);




/* ==============================================
   ADMIN — Requieren token + rol Administrador
============================================== */
// Listar todas las revistas (panel admin)
router.get('/admin',authMiddleware,roleMiddleware(['Administrador']),
  controller.getAllMagazines
);
// Subir revista
router.post('/admin/upload',authMiddleware,roleMiddleware(['Administrador']),
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'portada', maxCount: 1 }
  ]),
  controller.uploadMagazine
);

// Actualizar revista
router.put('/admin/:id',authMiddleware,roleMiddleware(['Administrador']),
  upload.fields([
    { name: 'pdf', maxCount: 1 }
  ]),
  controller.updateMagazine
);

// Desactivar revista
router.patch("/admin/:id/toggle-status",authMiddleware,roleMiddleware(['Administrador']),
  controller.toggleMagazineStatus
);

// Auditoría de compras
router.get('/admin/auditoria-compras',authMiddleware,roleMiddleware(['Administrador']),
  controller.getAuditoriaCompras
);

router.put('/admin/:id',authMiddleware,roleMiddleware(['Administrador']),
  upload.fields([
    { name: 'pdf', maxCount: 1 }
  ]),
  controller.updateMagazine
);

/* ==============================================
    CON PARÁMETRO — siempre al final
============================================== */
// Detalle de una revista
router.get('/:id', controller.getMagazineById);
// Ver revista comprada (valida acceso)
router.get('/:id/view', authMiddleware, controller.viewMagazine);





router.get('/test', (req, res) => {
  res.json({ ok: true });
});
export default router;
