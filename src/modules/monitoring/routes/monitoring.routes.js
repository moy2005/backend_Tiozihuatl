import express from "express";
import monitoringController from "../controllers/monitoring.controller.js";
import { authMiddleware } from "../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../core/middleware/role.middleware.js";

const router = express.Router();

// Acceso restringido solo a Administradores
const adminOnly = [authMiddleware, roleMiddleware(["Administrador"])];

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard",             ...adminOnly, monitoringController.getDashboard);

// ── Database ─────────────────────────────────────────────────────────────────
router.get("/database/status",       ...adminOnly, monitoringController.getDatabaseStatus);
router.get("/database/size",         ...adminOnly, monitoringController.getDatabaseSize);
router.get("/database/tables",       ...adminOnly, monitoringController.getTables);
router.get("/database/indexes",      ...adminOnly, monitoringController.getIndexes);

// ── Connections ───────────────────────────────────────────────────────────────
router.get("/connections",           ...adminOnly, monitoringController.getConnections);

// ── Queries ───────────────────────────────────────────────────────────────────
router.get("/queries/active",        ...adminOnly, monitoringController.getActiveQueries);
router.get("/queries/slow",          ...adminOnly, monitoringController.getSlowQueries);

// ── Performance ───────────────────────────────────────────────────────────────
router.get("/performance/tables",    ...adminOnly, monitoringController.getPerformanceTables);

// ── Growth ────────────────────────────────────────────────────────────────────
router.get("/growth",                ...adminOnly, monitoringController.getGrowth);

// ── Security ──────────────────────────────────────────────────────────────────
// Soporta query params: ?limit=100&offset=0&userId=5&action=LOGIN
router.get("/security/events",       ...adminOnly, monitoringController.getAuditEvents);
router.get("/security/sessions",     ...adminOnly, monitoringController.getActiveSessions);
router.get("/security/tokens",       ...adminOnly, monitoringController.getActiveTokens);

// ── Backups ───────────────────────────────────────────────────────────────────
// Soporta query params: ?limit=50&offset=0
router.get("/backups",               ...adminOnly, monitoringController.getBackupHistory);

// ── Scheduled Jobs ────────────────────────────────────────────────────────────
router.get("/jobs",                  ...adminOnly, monitoringController.getScheduledJobs);

// ── Análisis de producción ────────────────────────────────────────────────────
router.get("/analysis",              ...adminOnly, monitoringController.getAnalysis);


// ── Business Monitoring ──────────────────────────────────────────────────────

// Actividad general del sistema
router.get("/system/activity",       ...adminOnly, monitoringController.getSystemActivity);

// Biblioteca
router.get("/library/stats",         ...adminOnly, monitoringController.getLibraryStats);
router.get("/library/top-borrowed",  ...adminOnly, monitoringController.getMostBorrowedBooks);

// Revistas / ventas
router.get("/sales/stats",           ...adminOnly, monitoringController.getSalesStats);
router.get("/sales/top-magazines",   ...adminOnly, monitoringController.getTopSellingMagazines);

// Usuarios
router.get("/users/by-role",         ...adminOnly, monitoringController.getUsersByRole);
router.get("/users/most-active",     ...adminOnly, monitoringController.getMostActiveUsers);

// Académico
router.get("/academic/stats",        ...adminOnly, monitoringController.getAcademicStats);

export default router;