import { Router } from "express";
import { PasswordController } from "../controllers/password.controller.js";

const router = Router();

router.post("/forgot", PasswordController.forgotPassword);
router.post("/reset", PasswordController.resetPassword);

export default router;

