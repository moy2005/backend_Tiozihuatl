import { Router } from "express";
import { UserController } from "../controllers/profile.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";

const router = Router();

// Todas protegidas con token JWT
router.get("/profile/:id", authMiddleware, UserController.getProfile);
router.put("/profile/:id", authMiddleware, UserController.updateProfile);
router.put("/change-password", authMiddleware, UserController.changePassword);

export default router;
