import { Router } from "express";
import { PushController } from "../controllers/push.controller.js";
import { authMiddleware } from "../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../core/middleware/role.middleware.js";

const router = Router();
const adminGuard = [authMiddleware, roleMiddleware(["Administrador"])];

// Administración
router.get("/admin/stats", ...adminGuard, PushController.estadisticas);
router.post("/admin/send", ...adminGuard, PushController.enviar);

// Usuario
router.get("/public-key", PushController.publicKey);
router.post("/subscribe", authMiddleware, PushController.suscribir);
// Sin auth: se llama al cerrar sesión y el endpoint por sí mismo identifica la suscripción.
router.delete("/subscribe", PushController.desuscribir);

// Bandeja dentro de la web
router.get("/", authMiddleware, PushController.bandeja);
router.get("/unread-count", authMiddleware, PushController.noLeidas);
router.patch("/read-all", authMiddleware, PushController.marcarTodasLeidas);
router.patch("/:id/read", authMiddleware, PushController.marcarLeida);

export default router;
