import { Router } from "express";
import { PasswordController } from "../controllers/password.controller.js";

const router = Router();

// Enviar enlace de recuperación
router.post("/forgot", PasswordController.forgotPassword);

// Validar token desde el enlace
router.get("/validate", PasswordController.validateToken);

// Restablecer contraseña con token válido
router.post("/reset", PasswordController.resetPassword);

export default router;
