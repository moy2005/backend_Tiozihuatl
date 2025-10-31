import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../../../core/middleware/auth.middleware.js';

const router = express.Router();

// Registro
router.post('/register', AuthController.register);
router.get("/check-email", AuthController.checkEmail);
router.get("/check-phone", AuthController.checkPhone);

// Inicio de sesión
router.post('/login', AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Obtener perfil del usuario autenticado
router.get("/me", authMiddleware, AuthController.me);

export default router;
