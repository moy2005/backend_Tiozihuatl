import { Router } from "express";
import { AdminPrestamoController } from "../controllers/admin.prestamo.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();
const guard = [authMiddleware, roleMiddleware(["Administrador"])];

router.get("/",               ...guard, AdminPrestamoController.listar);
router.post("/",              ...guard, AdminPrestamoController.registrar);
router.patch("/:id/devolver", ...guard, AdminPrestamoController.devolver);
router.patch("/:id/cancelar", ...guard, AdminPrestamoController.cancelar);
router.patch("/:id/vencido",  ...guard, AdminPrestamoController.marcarVencido);
router.patch("/:id/observaciones", ...guard, AdminPrestamoController.actualizarObservaciones);

export default router;