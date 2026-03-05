import { Router } from "express";
import { AdminContactController } from "../controllers/admin.contact.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();

router.get("/", authMiddleware, roleMiddleware(["Administrador"]), AdminContactController.getAll);
router.post("/", authMiddleware, roleMiddleware(["Administrador"]), AdminContactController.save);

export default router;

