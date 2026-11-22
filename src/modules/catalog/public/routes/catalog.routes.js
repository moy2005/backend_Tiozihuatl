import express from 'express';
import catalogController from '../controllers/catalog.controller.js';
import { authMiddleware } from '../../../../core/middleware/auth.middleware.js';
import { roleMiddleware } from '../../../../core/middleware/role.middleware.js';


const router = express.Router();

/**
 * Biblioteca Digital solo para la comunidad institucional (#216): sin sesión responde 401
 * y con la sesión de un Visitante, 403. Las materias y los semestres siguen públicos
 * porque solo alimentan los filtros y no exponen libros ni archivos.
 */
export const ROLES_BIBLIOTECA = ["Estudiante", "Docente", "Administrador", "Bibliotecario"];
const soloComunidad = [authMiddleware, roleMiddleware(ROLES_BIBLIOTECA)];

router.get("/", ...soloComunidad, catalogController.getCatalog);
router.get("/materias", catalogController.getMaterias);
router.get("/libros/:id/pdf-url", ...soloComunidad, catalogController.getPdfUrl);
router.get("/libros/:id/preview", ...soloComunidad, catalogController.preview);
router.get("/semestres", catalogController.getSemestres);

export default router;
