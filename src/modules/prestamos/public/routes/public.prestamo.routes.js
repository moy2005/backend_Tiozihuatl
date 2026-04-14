import { Router } from "express";
import { PublicPrestamoController } from "../controllers/public.prestamos.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();
const guard = [authMiddleware, roleMiddleware(["Estudiante"])];

router.get("/", ...guard, PublicPrestamoController.obtenerMisPrestamos);
router.post("/", ...guard, PublicPrestamoController.solicitar);

export default router;
