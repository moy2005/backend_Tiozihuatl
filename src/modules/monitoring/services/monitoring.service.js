import monitoringModel from "../../../modules/monitoring/models/monitoring.model.js";

/* ===============================
   DASHBOARD
================================ */

const getDashboardSummary = async () => {
  return monitoringModel.getDashboardSummary();
};


/* ===============================
   DATABASE STATUS
================================ */

const getDatabaseStatus = async () => {
  const [status, engines] = await Promise.all([
    monitoringModel.getDatabaseStatus(),
    monitoringModel.getDatabaseEngines(),
  ]);
  return { status, engines };
};

const getDatabaseSize = async () => {
  return monitoringModel.getDatabaseStatus();
};


/* ===============================
   TABLES & INDEXES
================================ */

const getTablesDetail = async () => {
  return monitoringModel.getTablesSizeDetail();
};

const getIndexesDetail = async () => {
  return monitoringModel.getIndexesDetail();
};


/* ===============================
   CONNECTIONS
================================ */

const getConnections = async () => {
  const [stats, processList] = await Promise.all([
    monitoringModel.getConnectionStats(),
    monitoringModel.getActiveProcessList(),
  ]);
  return { stats, process_list: processList };
};


/* ===============================
   QUERIES
================================ */

const getActiveQueries = async () => {
  return monitoringModel.getActiveQueries();
};

const getSlowQueries = async () => {
  return monitoringModel.getSlowQueryStats();
};


/* ===============================
   PERFORMANCE
================================ */

const getPerformanceTables = async () => {
  const [ioStats, globalVars] = await Promise.all([
    monitoringModel.getTableIOStats(),
    monitoringModel.getGlobalPerformanceVars(),
  ]);
  return { table_io: ioStats, global_status: globalVars };
};


/* ===============================
   GROWTH
================================ */

const getGrowth = async () => {
  return monitoringModel.getGrowthByTable();
};


/* ===============================
   SECURITY – AUDIT EVENTS
================================ */

const getAuditEvents = async ({ limit, offset, userId, action } = {}) => {
  const [rows, total] = await Promise.all([
    monitoringModel.getAuditEvents({ limit, offset, userId, action }),
    monitoringModel.getAuditEventCount({ userId, action }),
  ]);
  return { total, data: rows };
};


/* ===============================
   SECURITY – SESSIONS
================================ */

const getActiveSessions = async () => {
  const [sessions, total] = await Promise.all([
    monitoringModel.getActiveSessions(),
    monitoringModel.getActiveSessionCount(),
  ]);
  return { total, data: sessions };
};


/* ===============================
   SECURITY – TOKENS
================================ */

const getActiveTokens = async () => {
  const [tokens, total] = await Promise.all([
    monitoringModel.getActiveTokens(),
    monitoringModel.getActiveTokenCount(),
  ]);
  return { total, data: tokens };
};


/* ===============================
   BACKUPS
================================ */

const getBackupHistory = async ({ limit, offset } = {}) => {
  return monitoringModel.getBackupHistory({ limit, offset });
};


/* ===============================
   SCHEDULED JOBS
================================ */

const getScheduledJobs = async () => {
  return monitoringModel.getScheduledJobs();
};


/* ===============================
   ANÁLISIS DE PRODUCCIÓN
================================ */

// Un solo endpoint que carga todo junto para la tab Análisis
const getAnalysis = async () => {
  const [volume, activity, waits, indexAnalysis, health] = await Promise.all([
    monitoringModel.getTopTablesByVolume(),
    monitoringModel.getTableActivity(),
    monitoringModel.getTableWaitTimes(),
    monitoringModel.getIndexAnalysis(),
    monitoringModel.getTableHealth(),
  ]);
  return { volume, activity, waits, index_analysis: indexAnalysis, health };
};

/* ===============================
   BUSINESS MONITORING
================================ */

// Actividad general del sistema
const getSystemActivity = async () => {
  return monitoringModel.getSystemActivity();
};

// Estadísticas de biblioteca
const getLibraryStats = async () => {
  return monitoringModel.getLibraryStats();
};

// Libros más prestados
const getMostBorrowedBooks = async () => {
  return monitoringModel.getMostBorrowedBooks();
};

// Estadísticas de ventas
const getSalesStats = async () => {
  return monitoringModel.getSalesStats();
};

// Revistas más vendidas
const getTopSellingMagazines = async () => {
  return monitoringModel.getTopSellingMagazines();
};

// Usuarios por rol
const getUsersByRole = async () => {
  return monitoringModel.getUsersByRole();
};

// Usuarios más activos
const getMostActiveUsers = async () => {
  return monitoringModel.getMostActiveUsers();
};

// Estadísticas académicas
const getAcademicStats = async () => {
  return monitoringModel.getAcademicStats();
};



export default {
  getDashboardSummary,
  getDatabaseStatus,
  getDatabaseSize,
  getTablesDetail,
  getIndexesDetail,
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