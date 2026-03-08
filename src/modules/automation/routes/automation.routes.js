import express from "express";
import automationController from "../controllers/automation.controller.js";
import {authMiddleware} from "../../../core/middleware/auth.middleware.js";
import {roleMiddleware} from "../../../core/middleware/role.middleware.js";

const router = express.Router();

router.post("/task",authMiddleware,roleMiddleware(["Administrador"]),automationController.createTask);
router.get("/tasks",authMiddleware,roleMiddleware(["Administrador"]),automationController.getTasks);
router.patch("/task/:id/toggle",authMiddleware,roleMiddleware(["Administrador"]),automationController.toggleTask);
router.delete("/task/:id",authMiddleware,roleMiddleware(["Administrador"]),automationController.deleteTask);
router.post(
  "/run-pending",
  automationController.runPendingTasks
  // Sin authMiddleware — lo protege el secret header
);

export default router;

