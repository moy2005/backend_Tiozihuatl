import express from "express";
import {runManual, getStatus, getLogs, getLogDetail, runCron, getTablasDetectadas} from "../controllers/maintenance.controller.js";
import { authMiddleware } from "../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../core/middleware/role.middleware.js";

const router = express.Router();

router.post("/run", authMiddleware, roleMiddleware(["Administrador"]), runManual);
router.get("/status", authMiddleware, roleMiddleware(["Administrador"]), getStatus);
router.get("/logs", authMiddleware, roleMiddleware(["Administrador"]), getLogs);
router.get("/logs/:id", authMiddleware, roleMiddleware(["Administrador"]), getLogDetail);
router.post("/run-cron", runCron);
router.get("/tablas-detectadas", authMiddleware, roleMiddleware(["Administrador"]), getTablasDetectadas);

export default router;
