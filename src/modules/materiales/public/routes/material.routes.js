import { Router } from "express";
import { getMaterials, getMaterias, getSemestres, getDocentes, getDocenteInfo, getByDocente, getAllWithDocente, getMaterialRecommendations } from "../controllers/material.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();

/**
 * Materiales Complementarios solo para la comunidad institucional (#216): sin sesión
 * responde 401 y con la sesión de un Visitante, 403. Las materias y los semestres siguen
 * públicos porque solo alimentan los filtros y no exponen materiales ni archivos.
 */
export const ROLES_MATERIALES = ["Estudiante", "Docente", "Administrador"];
const soloComunidad = [authMiddleware, roleMiddleware(ROLES_MATERIALES)];

router.get("/materiales/todos", ...soloComunidad, getAllWithDocente);
router.get("/", ...soloComunidad, getMaterials);
router.get("/materias", getMaterias);
router.get("/semestres", getSemestres);
router.get("/docentes", ...soloComunidad, getDocentes);
router.get("/recomendaciones/:id", ...soloComunidad, getMaterialRecommendations);
router.get("/docente/:id", ...soloComunidad, getDocenteInfo);
router.get("/docente/:id/materiales", ...soloComunidad, getByDocente);

export default router;
