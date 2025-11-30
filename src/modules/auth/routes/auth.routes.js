import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../../../core/middleware/auth.middleware.js';
import { validateRegisterData } from '../../../core/middleware/validateRegister.middleware.js';

const router = express.Router();

// Registro
router.post('/register',validateRegisterData, AuthController.register);
router.get("/check-email", AuthController.checkEmail);
router.get("/check-phone", AuthController.checkPhone);

// Inicio de sesión
router.post('/login', AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Obtener perfil del usuario autenticado
router.get("/me", authMiddleware, AuthController.me);

router.post("/pre-registro",validateRegisterData, AuthController.preRegistro);
router.get("/verify-email", AuthController.verifyEmail);
router.post("/finalizar-registro",validateRegisterData, AuthController.finalizarRegistro);


export default router;
