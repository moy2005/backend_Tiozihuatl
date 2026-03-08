import { Router } from "express";
import { AdminAboutController } from "../controllers/admin.about.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["Administrador"]),
  AdminAboutController.getAll
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Administrador"]),
  AdminAboutController.create
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["Administrador"]),
  AdminAboutController.update
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["Administrador"]),
  AdminAboutController.delete
);

export default router;
