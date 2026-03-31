import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../../../core/middleware/auth.middleware.js';
import { validateRegisterData } from '../../../core/middleware/validateRegister.middleware.js';
import { ActivationController } from '../controllers/activation.controller.js';

const router = express.Router();

router.post('/register',validateRegisterData, AuthController.register);
router.get("/check-email", AuthController.checkEmail);
router.get("/check-phone", AuthController.checkPhone);
router.post('/login', AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.get("/me", authMiddleware, AuthController.me);
router.post("/activity", authMiddleware, AuthController.touchActivity);
router.post("/pre-registro",validateRegisterData, AuthController.preRegistro);
router.get("/verify-email", AuthController.verifyEmail);
router.post("/finalizar-registro",validateRegisterData, AuthController.finalizarRegistro);

// Verificar token antes de mostrar formulario
router.get("/activate-account", ActivationController.verifyToken);

// Activar cuenta con contraseña
router.post("/activate-account", ActivationController.activateAccount);


export default router;
