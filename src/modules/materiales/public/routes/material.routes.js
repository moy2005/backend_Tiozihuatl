import { Router } from "express";
import { getMaterials, getMaterias, getSemestres, getDocentes, getDocenteInfo, getByDocente, getAllWithDocente, getMaterialRecommendations } from "../controllers/material.controller.js";

const router = Router();

router.get("/materiales/todos", getAllWithDocente);
router.get("/", getMaterials);
router.get("/materias", getMaterias);
router.get("/semestres", getSemestres);
router.get("/docentes", getDocentes);
router.get("/recomendaciones/:id", getMaterialRecommendations);
router.get("/docente/:id", getDocenteInfo);
router.get("/docente/:id/materiales", getByDocente);

export default router;
