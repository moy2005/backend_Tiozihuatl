import { Router } from "express";
import reportsController from "../controllers/reports.controller.js";
import { authMiddleware } from "../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../core/middleware/role.middleware.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware(["Administrador"])];

router.get("/snapshot", ...adminOnly, reportsController.getSnapshot);

export default router;
