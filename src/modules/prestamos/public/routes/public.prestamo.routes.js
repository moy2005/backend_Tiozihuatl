import { Router } from "express";
import { PublicPrestamoController } from "../controllers/public.prestamos.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, PublicPrestamoController.obtenerMisPrestamos);
router.post("/", authMiddleware, PublicPrestamoController.solicitar);

export default router;