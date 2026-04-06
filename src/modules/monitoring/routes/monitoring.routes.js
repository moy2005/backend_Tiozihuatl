import express from "express";
import monitoringController from "../controllers/monitoring.controller.js";
import { authMiddleware } from "../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../core/middleware/role.middleware.js";

const router = express.Router();
const adminOnly = [authMiddleware, roleMiddleware(["Administrador"])];

router.get("/snapshot", ...adminOnly, monitoringController.getSnapshot);
router.get("/dashboard", ...adminOnly, monitoringController.getDashboard);
router.get("/health-score", ...adminOnly, monitoringController.getHealthScore);
router.get("/database", ...adminOnly, monitoringController.getDatabaseStatus);
router.get("/storage", ...adminOnly, monitoringController.getStorage);
router.get("/indexes", ...adminOnly, monitoringController.getIndexes);
router.get("/connections", ...adminOnly, monitoringController.getConnections);
router.get("/queries", ...adminOnly, monitoringController.getQueries);
router.get("/performance", ...adminOnly, monitoringController.getPerformance);
router.get("/performance-schema", ...adminOnly, monitoringController.getPerformanceSchema);
router.get("/locks", ...adminOnly, monitoringController.getLocks);
router.get("/locks/deadlock", ...adminOnly, monitoringController.getLastDeadlock);
router.get("/maintenance", ...adminOnly, monitoringController.getMaintenance);
router.get("/alerts", ...adminOnly, monitoringController.getAlerts);

export default router;
