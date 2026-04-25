import { Router } from "express";
import { AdminEventsController } from "../controllers/admin.events.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";
import { upload } from "../../../../core/middleware/upload.middleware.js";

const router = Router();

const adminOnly = [authMiddleware, roleMiddleware(["Administrador"])];

router.get("/", ...adminOnly, AdminEventsController.getAll);
router.put("/imagenes/reordenar", ...adminOnly, AdminEventsController.reorderImagenes);
router.delete("/imagenes/:id_imagen", ...adminOnly, AdminEventsController.deleteImagen);
router.post(
  "/",
  ...adminOnly,
  upload.fields([{ name: "imagenes", maxCount: 15 }]),
  AdminEventsController.create
);
router.put(
  "/:id",
  ...adminOnly,
  upload.fields([{ name: "imagenes", maxCount: 15 }]),
  AdminEventsController.update
);
router.patch("/:id/destacado", ...adminOnly, AdminEventsController.updateDestacado);
router.delete("/:id", ...adminOnly, AdminEventsController.delete);

export default router;
