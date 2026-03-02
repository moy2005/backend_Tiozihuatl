import { Router } from "express";
import * as Controller from "../controllers/admin.calendar.controller.js";
import ControllerUpload from "../controllers/upload.calendar.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = Router();

// 🔐 Solo ADMINISTRADOR

router.get("/", authMiddleware,roleMiddleware(["Administrador"]),Controller.getCalendars);
router.post("/upload",authMiddleware,roleMiddleware(["Administrador"]),ControllerUpload.uploadCalendar);
router.post("/",authMiddleware,roleMiddleware(["Administrador"]),Controller.createCalendar);
router.put("/:id",authMiddleware,roleMiddleware(["Administrador"]),Controller.updateCalendar);
router.put("/:id/status",authMiddleware,roleMiddleware(["Administrador"]),Controller.toggleStatus);
router.delete("/:id",authMiddleware,roleMiddleware(["Administrador"]),Controller.deleteCalendar);

export default router;

