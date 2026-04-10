import { Router } from "express"; 
import * as Controller from "../controllers/periodos.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();

router.get("/", authMiddleware, roleMiddleware(["Administrador"]), Controller.getPeriodos);
router.post("/", authMiddleware, roleMiddleware(["Administrador"]), Controller.createPeriodo);
router.put("/:id", authMiddleware, roleMiddleware(["Administrador"]), Controller.updatePeriodo);
router.put("/:id/activar", authMiddleware, roleMiddleware(["Administrador"]), Controller.activarPeriodo);
router.get("/:id/can-delete", authMiddleware, roleMiddleware(["Administrador"]), Controller.canDeletePeriodo);
router.delete("/:id", authMiddleware, roleMiddleware(["Administrador"]), Controller.deletePeriodo);

export default router; 