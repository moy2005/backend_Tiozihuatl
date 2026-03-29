import express from 'express';
import catalogController from '../controllers/catalog.controller.js';
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = express.Router();

router.get( "/", authMiddleware,roleMiddleware(["Estudiante", "Docente", "Bibliotecario", "Administrador"]), catalogController.getCatalog);
router.get("/materias", authMiddleware,roleMiddleware(["Estudiante", "Docente", "Bibliotecario", "Administrador"]), catalogController.getMaterias);
router.get("/libros/:id/pdf-url", authMiddleware, roleMiddleware(["Estudiante", "Docente", "Bibliotecario", "Administrador"]), catalogController.getPdfUrl);
router.get("/libros/:id/preview", authMiddleware,roleMiddleware(["Estudiante", "Docente", "Bibliotecario", "Administrador"]), catalogController.preview);
router.get("/semestres", authMiddleware, roleMiddleware(["Estudiante", "Docente", "Bibliotecario", "Administrador"]), catalogController.getSemestres);

export default router;
