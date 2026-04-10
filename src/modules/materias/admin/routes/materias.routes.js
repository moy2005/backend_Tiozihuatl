import { Router } from "express";
import * as Controller from "../controllers/materias.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();

router.get("/", authMiddleware, roleMiddleware(["Administrador"]), Controller.getMaterias);
router.post("/", authMiddleware, roleMiddleware(["Administrador"]), Controller.createMateria);
router.put("/:id", authMiddleware, roleMiddleware(["Administrador"]), Controller.updateMateria);
router.put("/:id/status", authMiddleware, roleMiddleware(["Administrador"]), Controller.toggleMateria);
router.delete("/:id", authMiddleware, roleMiddleware(["Administrador"]), Controller.deleteMateria);
router.get("/:id/can-delete", authMiddleware, roleMiddleware(["Administrador"]), Controller.canDeleteMateria);

export default router;