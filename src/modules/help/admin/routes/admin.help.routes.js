import { Router } from "express";
import { AdminHelpController } from "../controllers/admin.help.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();

// CRUD solo administradores
router.get("/", authMiddleware, roleMiddleware(["Administrador"]), AdminHelpController.getAll);
router.post("/", authMiddleware, roleMiddleware(["Administrador"]), AdminHelpController.create);
router.put("/:id", authMiddleware, roleMiddleware(["Administrador"]), AdminHelpController.update);
router.delete("/:id", authMiddleware, roleMiddleware(["Administrador"]), AdminHelpController.delete);

export default router;

