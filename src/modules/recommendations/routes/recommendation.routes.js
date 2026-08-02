import express from "express";
import { recommendationsForBook } from "../controllers/recommendation.controller.js";
import {
  adminClusterDashboard,
  studentClusterShelves,
} from "../controllers/clustering.controller.js";
import { authMiddleware } from "../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../core/middleware/role.middleware.js";

const router = express.Router();

router.get(
  "/clusters/student",
  authMiddleware,
  roleMiddleware(["Estudiante", "Administrador"]),
  studentClusterShelves
);
router.get(
  "/clusters/admin",
  authMiddleware,
  roleMiddleware(["Administrador"]),
  adminClusterDashboard
);
router.get("/books/:id", authMiddleware, recommendationsForBook);

export default router;
