import express from "express";
import backupController from "../controllers/backup.controller.js";
import {authMiddleware} from "../../../core/middleware/auth.middleware.js";
import {roleMiddleware} from "../../../core/middleware/role.middleware.js";

const router = express.Router();

router.get("/database", authMiddleware, roleMiddleware(["Administrador"]), backupController.backupFull);
router.get("/table/:table", authMiddleware, roleMiddleware(["Administrador"]), backupController.backupSingleTable);
router.get("/tables",authMiddleware,roleMiddleware(["Administrador"]),backupController.getTables);
router.get("/history",authMiddleware,roleMiddleware(["Administrador"]),backupController.getBackupHistory);

export default router;

