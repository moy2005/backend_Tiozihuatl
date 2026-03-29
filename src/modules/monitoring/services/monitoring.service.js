import databaseModel from "../models/database.model.js";
import connectionsModel from "../models/connections.model.js";
import queriesModel from "../models/queries.model.js";
import performanceModel from "../models/performance.model.js";
import storageModel from "../models/storage.model.js";
import indexesModel from "../models/indexes.model.js";
import securityModel from "../models/security.model.js";
import backupsModel from "../models/backups.model.js";
import alertsModel from "../models/alerts.model.js";
import dashboardModel from "../models/dashboard.model.js";
import locksModel from "../models/locks.model.js";
import performanceSchemaModel from "../models/performanceSchema.model.js";
import maintenanceModel from "../models/maintenance.model.js";

const SNAPSHOT_CACHE_TTL_MS = 5000;
let snapshotCache = null;
let snapshotCacheExpiresAt = 0;
let snapshotInFlight = null;

const getDashboard = async () => dashboardModel.getDashboard();

const getDatabaseStatus = async () => {
  const [status, engines] = await Promise.all([
    databaseModel.getDatabaseStatus(),
    databaseModel.getDatabaseEngines()
  ]);

  return { status, engines };
};

const getStorage = async () => {
  const [tables, fragmentation] = await Promise.all([
    storageModel.getTablesSize(),
    storageModel.getFragmentation()
  ]);

  return { tables, fragmentation };
};

const getIndexes = async () => {
  const [indexes, noPK, unusedIndexes] = await Promise.all([
    indexesModel.getIndexes(),
    indexesModel.getTablesWithoutPK(),
    performanceSchemaModel.getUnusedIndexes()
  ]);

  return { indexes, tables_without_pk: noPK, unused_indexes: unusedIndexes };
};

const getConnections = async () => {
  const [stats, processList] = await Promise.all([
    connectionsModel.getConnectionStats(),
    connectionsModel.getProcessList()
  ]);

  return { stats, process_list: processList };
};

const getQueries = async () => {
  const [active, slow] = await Promise.all([
    queriesModel.getActiveQueries(),
    queriesModel.getSlowQueries()
  ]);

  return { active, slow };
};

const getPerformance = async () => performanceModel.getGlobalStats();

const getSecurity = async () => securityModel.getUsers();

const getBackups = async () => backupsModel.getBackupHistory();

const getAlerts = async () => alertsModel.getAlerts();

const getLocks = async () => {
  const [blocked, active, stats, lastDeadlock, deadlockCount] = await Promise.all([
    locksModel.getBlockedTransactions(),
    locksModel.getActiveTransactions(),
    locksModel.getLockStats(),
    locksModel.getLastDeadlock(),
    locksModel.getDeadlockCount()
  ]);

  return {
    blocked_transactions: blocked,
    active_transactions: active,
    lock_stats: stats,
    last_deadlock: lastDeadlock,
    deadlock_count: deadlockCount
  };
};

const getPerformanceSchema = async (limit = 20, minAvgMs = 10) => {
  const enabled = await performanceSchemaModel.isPerformanceSchemaEnabled();
  if (!enabled) {
    return {
      enabled: false,
      message: "performance_schema está deshabilitado. Actívalo en my.cnf: performance_schema=ON"
    };
  }

  const [topSlowQueries, unusedIndexes, topTablesByIO, extendedStats] = await Promise.all([
    performanceSchemaModel.getTopSlowQueries(limit, minAvgMs),
    performanceSchemaModel.getUnusedIndexes(),
    performanceSchemaModel.getTopTablesByIO(limit),
    performanceSchemaModel.getExtendedGlobalStats()
  ]);

  return {
    enabled: true,
    top_slow_queries: topSlowQueries,
    unused_indexes: unusedIndexes,
    top_tables_by_io: topTablesByIO,
    extended_stats: extendedStats
  };
};

const getMaintenance = async () => {
  const [optimizeCandidates, analyzeCandidates, healthScore] = await Promise.all([
    maintenanceModel.getOptimizeCandidates(),
    maintenanceModel.getAnalyzeCandidates(),
    maintenanceModel.calculateHealthScore()
  ]);

  return {
    optimize_candidates: optimizeCandidates,
    analyze_candidates: analyzeCandidates,
    health_score: healthScore
  };
};

const getHealthScore = async () => maintenanceModel.calculateHealthScore();

const buildSnapshot = async (limit = 10, minAvgMs = 5) => {
  const [database, storage, indexes] = await Promise.all([
    getDatabaseStatus(),
    getStorage(),
    getIndexes()
  ]);

  const [connections, queries, performance] = await Promise.all([
    getConnections(),
    getQueries(),
    getPerformance()
  ]);

  const [performanceSchema, locks] = await Promise.all([
    getPerformanceSchema(limit, minAvgMs),
    getLocks()
  ]);

  const [maintenance, security, backups] = await Promise.all([
    getMaintenance(),
    getSecurity(),
    getBackups()
  ]);

  const alerts = await alertsModel.getAlertsFromSnapshot({
    connections,
    performance,
    storage,
    locks
  });

  return {
    dashboard: {
      database: database.status,
      connections: connections.stats,
      slow_queries: queries.slow,
      performance,
      alerts
    },
    database,
    storage,
    indexes,
    connections,
    queries,
    performance,
    performanceSchema,
    locks,
    maintenance,
    healthScore: maintenance.health_score ?? null,
    security,
    backups,
    alerts,
    errors: []
  };
};

const getSnapshot = async (limit = 10, minAvgMs = 5, forceRefresh = false) => {
  const now = Date.now();

  if (!forceRefresh && snapshotCache && now < snapshotCacheExpiresAt) {
    return snapshotCache;
  }

  if (snapshotInFlight) {
    return snapshotInFlight;
  }

  const promise = buildSnapshot(limit, minAvgMs)
    .then((snapshot) => {
      snapshotCache = snapshot;
      snapshotCacheExpiresAt = Date.now() + SNAPSHOT_CACHE_TTL_MS;
      return snapshot;
    })
    .finally(() => {
      snapshotInFlight = null;
    });

  snapshotInFlight = promise;
  return promise;
};

export default {
  getDashboard,
  getDatabaseStatus,
  getStorage,
  getIndexes,
  getConnections,
  getQueries,
  getPerformance,
  getSecurity,
  getBackups,
  getAlerts,
  getLocks,
  getPerformanceSchema,
  getMaintenance,
  getHealthScore,
  getSnapshot
};
