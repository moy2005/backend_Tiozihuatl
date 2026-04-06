import monitoringService from "../services/monitoring.service.js";

/* ─────────────────────────────────────────────
   Helper centralizado de errores
───────────────────────────────────────────── */
const handleError = (res, error, message = "Error en monitoreo") => {
  console.error(`[Monitoring] ${message}:`, error?.message ?? error);
  res.status(500).json({
    message,
    error: process.env.NODE_ENV === "development" ? error?.message : undefined
  });
};

/* ═══════════════════════════════════════════
   EXISTENTES
═══════════════════════════════════════════ */

const getDashboard = async (req, res) => {
  try {
    res.json(await monitoringService.getDashboard());
  } catch (error) {
    handleError(res, error, "Error obteniendo dashboard");
  }
};

const getSnapshot = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const minAvgMs = Math.min(parseInt(req.query.min_avg_ms) || 5, 5000);
    const forceRefresh = String(req.query.force || "").toLowerCase() === "true";

    res.json(await monitoringService.getSnapshot(limit, minAvgMs, forceRefresh));
  } catch (error) {
    handleError(res, error, "Error obteniendo snapshot");
  }
};

const getDatabaseStatus = async (req, res) => {
  try {
    res.json(await monitoringService.getDatabaseStatus());
  } catch (error) {
    handleError(res, error, "Error obteniendo estado DB");
  }
};

const getStorage = async (req, res) => {
  try {
    res.json(await monitoringService.getStorage());
  } catch (error) {
    handleError(res, error, "Error obteniendo almacenamiento");
  }
};

const getIndexes = async (req, res) => {
  try {
    res.json(await monitoringService.getIndexes());
  } catch (error) {
    handleError(res, error, "Error obteniendo índices");
  }
};

const getConnections = async (req, res) => {
  try {
    res.json(await monitoringService.getConnections());
  } catch (error) {
    handleError(res, error, "Error obteniendo conexiones");
  }
};

const getQueries = async (req, res) => {
  try {
    res.json(await monitoringService.getQueries());
  } catch (error) {
    handleError(res, error, "Error obteniendo queries");
  }
};

const getPerformance = async (req, res) => {
  try {
    res.json(await monitoringService.getPerformance());
  } catch (error) {
    handleError(res, error, "Error obteniendo performance");
  }
};

const getAlerts = async (req, res) => {
  try {
    res.json(await monitoringService.getAlerts());
  } catch (error) {
    handleError(res, error, "Error obteniendo alertas");
  }
};

/* ═══════════════════════════════════════════
   NUEVOS
═══════════════════════════════════════════ */

/**
 * GET /monitoring/locks
 * Transacciones bloqueadas, row lock stats y deadlocks
 */
const getLocks = async (req, res) => {
  try {
    res.json(await monitoringService.getLocks());
  } catch (error) {
    handleError(res, error, "Error obteniendo locks");
  }
};

/**
 * GET /monitoring/locks/deadlock
 * Último deadlock registrado por InnoDB (parseo de INNODB STATUS)
 */
const getLastDeadlock = async (req, res) => {
  try {
    const data = await monitoringService.getLocks();
    res.json({
      deadlock_count: data.deadlock_count,
      last_deadlock: data.last_deadlock
    });
  } catch (error) {
    handleError(res, error, "Error obteniendo último deadlock");
  }
};

/**
 * GET /monitoring/performance-schema
 * Slow queries reales, índices sin uso, hot tables, métricas extendidas
 * Query params:
 *   ?limit=20       — top N slow queries (default: 20)
 *   ?min_avg_ms=10  — umbral mínimo en ms (default: 10)
 */
const getPerformanceSchema = async (req, res) => {
  try {
    const limit      = Math.min(parseInt(req.query.limit)      || 20,  100);
    const minAvgMs   = Math.min(parseInt(req.query.min_avg_ms) || 10, 5000);
    res.json(await monitoringService.getPerformanceSchema(limit, minAvgMs));
  } catch (error) {
    handleError(res, error, "Error obteniendo performance schema");
  }
};

/**
 * GET /monitoring/maintenance
 * Candidatos a OPTIMIZE/ANALYZE + health score completo
 */
const getMaintenance = async (req, res) => {
  try {
    res.json(await monitoringService.getMaintenance());
  } catch (error) {
    handleError(res, error, "Error obteniendo estado de mantenimiento");
  }
};

/**
 * GET /monitoring/health-score
 * Score rápido de salud (0–100) con grade y penalizaciones
 */
const getHealthScore = async (req, res) => {
  try {
    res.json(await monitoringService.getHealthScore());
  } catch (error) {
    handleError(res, error, "Error calculando health score");
  }
};

export default {
  // Existentes
  getDashboard,
  getSnapshot,
  getDatabaseStatus,
  getStorage,
  getIndexes,
  getConnections,
  getQueries,
  getPerformance,
  getAlerts,
  // Nuevos
  getLocks,
  getLastDeadlock,
  getPerformanceSchema,
  getMaintenance,
  getHealthScore
};
