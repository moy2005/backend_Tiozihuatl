import { Router } from "express";
import { AdminUserController } from "../controllers/admin.user.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";
import { validateUserFields } from "../../../../core/middleware/validateUserFields.middleware.js";

const router = Router();

// Solo administradores autenticados
router.get("/", authMiddleware, roleMiddleware(["Administrador"]), AdminUserController.getAll);
router.post("/", authMiddleware, roleMiddleware(["Administrador"]), validateUserFields, AdminUserController.create);
router.put("/:id", authMiddleware, roleMiddleware(["Administrador"]), validateUserFields, AdminUserController.update);
router.delete("/:id", authMiddleware, roleMiddleware(["Administrador"]), AdminUserController.delete);
router.get("/roles/all", authMiddleware, roleMiddleware(["Administrador"]), AdminUserController.getRoles);

export default router;

