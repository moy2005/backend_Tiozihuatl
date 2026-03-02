import { Router } from "express";
import { getPublicCalendar, getDocenteCalendar } from "../controllers/public.calendar.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";


const router = Router();

// 🔓 Público ALUMNO
router.get("/public/:tipo", getPublicCalendar);

// 🔐 Docente
router.get(
  "/docente",
  authMiddleware,
  roleMiddleware(["Docente"]),
  getDocenteCalendar
);

export default router;