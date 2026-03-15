import monitoringService from "../services/monitoring.service.js";


/* ===============================
   HELPER – respuesta de error uniforme
================================ */

const handleError = (res, error, message = "Error en el módulo de monitoreo") => {
  console.error(message, error);
  res.status(500).json({ message });
};


/* ===============================
   DASHBOARD – RESUMEN GENERAL
================================ */

const getDashboard = async (req, res) => {
  try {
    const data = await monitoringService.getDashboardSummary();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo resumen del dashboard");
  }
};


/* ===============================
   DATABASE STATUS
================================ */

const getDatabaseStatus = async (req, res) => {
  try {
    const data = await monitoringService.getDatabaseStatus();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo estado de la base de datos");
  }
};


/* ===============================
   DATABASE SIZE
================================ */

const getDatabaseSize = async (req, res) => {
  try {
    const data = await monitoringService.getDatabaseSize();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo tamaño de la base de datos");
  }
};


/* ===============================
   TABLAS
================================ */

const getTables = async (req, res) => {
  try {
    const data = await monitoringService.getTablesDetail();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo detalle de tablas");
  }
};


/* ===============================
   ÍNDICES
================================ */

const getIndexes = async (req, res) => {
  try {
    const data = await monitoringService.getIndexesDetail();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo índices");
  }
};


/* ===============================
   CONEXIONES
================================ */

const getConnections = async (req, res) => {
  try {
    const data = await monitoringService.getConnections();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo conexiones");
  }
};


/* ===============================
   CONSULTAS ACTIVAS
================================ */

const getActiveQueries = async (req, res) => {
  try {
    const data = await monitoringService.getActiveQueries();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo consultas activas");
  }
};


/* ===============================
   CONSULTAS LENTAS
================================ */

const getSlowQueries = async (req, res) => {
  try {
    const data = await monitoringService.getSlowQueries();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo estadísticas de consultas lentas");
  }
};


/* ===============================
   RENDIMIENTO – ACTIVIDAD POR TABLA
================================ */

const getPerformanceTables = async (req, res) => {
  try {
    const data = await monitoringService.getPerformanceTables();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo rendimiento por tabla");
  }
};


/* ===============================
   CRECIMIENTO DE TABLAS
================================ */

const getGrowth = async (req, res) => {
  try {
    const data = await monitoringService.getGrowth();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo datos de crecimiento");
  }
};


/* ===============================
   SEGURIDAD – AUDITORÍA
================================ */

const getAuditEvents = async (req, res) => {
  try {
    const { limit = 100, offset = 0, userId, action } = req.query;
    const data = await monitoringService.getAuditEvents({
      limit:  Number(limit),
      offset: Number(offset),
      userId: userId ?? null,
      action: action ?? null,
    });
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo eventos de auditoría");
  }
};


/* ===============================
   SEGURIDAD – SESIONES ACTIVAS
================================ */

const getActiveSessions = async (req, res) => {
  try {
    const data = await monitoringService.getActiveSessions();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo sesiones activas");
  }
};


/* ===============================
   SEGURIDAD – TOKENS ACTIVOS
================================ */

const getActiveTokens = async (req, res) => {
  try {
    const data = await monitoringService.getActiveTokens();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo tokens activos");
  }
};


/* ===============================
   BACKUPS – HISTORIAL
================================ */

const getBackupHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const data = await monitoringService.getBackupHistory({
      limit:  Number(limit),
      offset: Number(offset),
    });
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo historial de backups");
  }
};


/* ===============================
   TAREAS PROGRAMADAS
================================ */

const getScheduledJobs = async (req, res) => {
  try {
    const data = await monitoringService.getScheduledJobs();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo tareas programadas");
  }
};


/* ===============================
   ANÁLISIS DE PRODUCCIÓN
================================ */

const getAnalysis = async (req, res) => {
  try {
    const data = await monitoringService.getAnalysis();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo análisis de producción");
  }
};


/* ===============================
   BUSINESS MONITORING – ACTIVIDAD DEL SISTEMA
================================ */

const getSystemActivity = async (req, res) => {
  try {
    const data = await monitoringService.getSystemActivity();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo actividad del sistema");
  }
};


/* ===============================
   BUSINESS MONITORING – BIBLIOTECA
================================ */

const getLibraryStats = async (req, res) => {
  try {
    const data = await monitoringService.getLibraryStats();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo estadísticas de biblioteca");
  }
};

const getMostBorrowedBooks = async (req, res) => {
  try {
    const data = await monitoringService.getMostBorrowedBooks();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo libros más prestados");
  }
};


/* ===============================
   BUSINESS MONITORING – REVISTAS / VENTAS
================================ */

const getSalesStats = async (req, res) => {
  try {
    const data = await monitoringService.getSalesStats();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo estadísticas de ventas");
  }
};

const getTopSellingMagazines = async (req, res) => {
  try {
    const data = await monitoringService.getTopSellingMagazines();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo revistas más vendidas");
  }
};


/* ===============================
   BUSINESS MONITORING – USUARIOS
================================ */

const getUsersByRole = async (req, res) => {
  try {
    const data = await monitoringService.getUsersByRole();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo usuarios por rol");
  }
};

const getMostActiveUsers = async (req, res) => {
  try {
    const data = await monitoringService.getMostActiveUsers();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo usuarios más activos");
  }
};


/* ===============================
   BUSINESS MONITORING – SISTEMA ACADÉMICO
================================ */

const getAcademicStats = async (req, res) => {
  try {
    const data = await monitoringService.getAcademicStats();
    res.json(data);
  } catch (error) {
    handleError(res, error, "Error obteniendo estadísticas académicas");
  }
};

export default {
  getDashboard,
  getDatabaseStatus,
  getDatabaseSize,
  getTables,
  getIndexes,
  getConnections,
  getActiveQueries,
  getSlowQueries,
  getPerformanceTables,
  getGrowth,
  getAnalysis,
  getAuditEvents,
  getActiveSessions,
  getActiveTokens,
  getBackupHistory,
  getScheduledJobs,
  getSystemActivity,
  getLibraryStats,
  getMostBorrowedBooks,
  getSalesStats,
  getTopSellingMagazines,
  getUsersByRole,
  getMostActiveUsers,
  getAcademicStats
};