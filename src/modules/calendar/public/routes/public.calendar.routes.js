import { Router } from "express";
import { getPublicCalendar, getDocenteCalendar } from "../controllers/public.calendar.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();

router.get("/public/:tipo", getPublicCalendar);//  Público ESTUDIANTE
router.get("/docente", authMiddleware, roleMiddleware(["Docente"]), getDocenteCalendar);//  Docente

export default router;
