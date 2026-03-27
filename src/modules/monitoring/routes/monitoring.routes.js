import express from "express";
import monitoringController from "../controllers/monitoring.controller.js";
import { authMiddleware } from "../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../core/middleware/role.middleware.js";

const router = express.Router();

// Todos los endpoints son solo para Administrador
const adminOnly = [authMiddleware, roleMiddleware(["Administrador"])];

/* ═══════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════ */
router.get("/dashboard",          ...adminOnly, monitoringController.getDashboard);

/* ═══════════════════════════════════════════
   HEALTH SCORE  ← nuevo (va arriba para que
   no colisione con subrutas)
═══════════════════════════════════════════ */
router.get("/health-score",       ...adminOnly, monitoringController.getHealthScore);

/* ═══════════════════════════════════════════
   DATABASE
═══════════════════════════════════════════ */
router.get("/database",           ...adminOnly, monitoringController.getDatabaseStatus);

/* ═══════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════ */
router.get("/storage",            ...adminOnly, monitoringController.getStorage);

/* ═══════════════════════════════════════════
   INDEXES
   Ahora incluye índices sin uso (performance_schema)
═══════════════════════════════════════════ */
router.get("/indexes",            ...adminOnly, monitoringController.getIndexes);

/* ═══════════════════════════════════════════
   CONNECTIONS
═══════════════════════════════════════════ */
router.get("/connections",        ...adminOnly, monitoringController.getConnections);

/* ═══════════════════════════════════════════
   QUERIES
═══════════════════════════════════════════ */
router.get("/queries",            ...adminOnly, monitoringController.getQueries);

/* ═══════════════════════════════════════════
   PERFORMANCE (métricas base originales)
═══════════════════════════════════════════ */
router.get("/performance",        ...adminOnly, monitoringController.getPerformance);

/* ═══════════════════════════════════════════
   PERFORMANCE SCHEMA  ← nuevo
   ?limit=20&min_avg_ms=10
═══════════════════════════════════════════ */
router.get("/performance-schema", ...adminOnly, monitoringController.getPerformanceSchema);

/* ═══════════════════════════════════════════
   LOCKS  ← nuevo
═══════════════════════════════════════════ */
router.get("/locks",              ...adminOnly, monitoringController.getLocks);
router.get("/locks/deadlock",     ...adminOnly, monitoringController.getLastDeadlock);

/* ═══════════════════════════════════════════
   REPLICATION  ← nuevo
═══════════════════════════════════════════ */
router.get("/replication",        ...adminOnly, monitoringController.getReplication);

/* ═══════════════════════════════════════════
   MAINTENANCE  ← nuevo
   OPTIMIZE / ANALYZE candidates + health score completo
═══════════════════════════════════════════ */
router.get("/maintenance",        ...adminOnly, monitoringController.getMaintenance);

/* ═══════════════════════════════════════════
   SECURITY
═══════════════════════════════════════════ */
router.get("/security",           ...adminOnly, monitoringController.getSecurity);

/* ═══════════════════════════════════════════
   BACKUPS
═══════════════════════════════════════════ */
router.get("/backups",            ...adminOnly, monitoringController.getBackups);

/* ═══════════════════════════════════════════
   ALERTS  (ahora estructuradas con severidad)
═══════════════════════════════════════════ */
router.get("/alerts",             ...adminOnly, monitoringController.getAlerts);

export default router;
