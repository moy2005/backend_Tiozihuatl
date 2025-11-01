import { Router } from "express";
import { UserController } from "../controllers/profile.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, UserController.getProfile);
router.put("/", authMiddleware, UserController.updateProfile);
router.put("/change-password", authMiddleware, UserController.changePassword);

export default router;
