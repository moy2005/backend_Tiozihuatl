import databaseModel       from "../models/database.model.js";
import connectionsModel    from "../models/connections.model.js";
import queriesModel        from "../models/queries.model.js";
import performanceModel    from "../models/performance.model.js";
import storageModel        from "../models/storage.model.js";
import indexesModel        from "../models/indexes.model.js";
import securityModel       from "../models/security.model.js";
import backupsModel        from "../models/backups.model.js";
import alertsModel         from "../models/alerts.model.js";
import dashboardModel      from "../models/dashboard.model.js";
// ── Nuevos modelos ───────────────────────────────────────────
import locksModel          from "../models/locks.model.js";
import replicationModel    from "../models/replication.model.js";
import performanceSchemaModel from "../models/performanceSchema.model.js";
import maintenanceModel    from "../models/maintenance.model.js";

/* ═══════════════════════════════════════════
   EXISTENTES
═══════════════════════════════════════════ */

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
    performanceSchemaModel.getUnusedIndexes()   // ← nuevo: índices sin uso
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

/* ═══════════════════════════════════════════
   NUEVOS
═══════════════════════════════════════════ */

/**
 * Locks e InnoDB: transacciones bloqueadas, row lock stats, deadlocks
 */
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

/**
 * Replicación: estado de réplica, source status, réplicas conectadas
 */
const getReplication = async () => {
  const [replica, source, connectedReplicas] = await Promise.all([
    replicationModel.getReplicaStatus(),
    replicationModel.getSourceStatus(),
    replicationModel.getConnectedReplicas()
  ]);

  return {
    replica_status: replica,
    source_status: source,
    connected_replicas: connectedReplicas,
    topology: replica ? "replica" : source ? "source" : "standalone"
  };
};

/**
 * Performance Schema: slow queries reales, top I/O, métricas extendidas
 */
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

/**
 * Mantenimiento: candidatos OPTIMIZE/ANALYZE, health score
 */
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

/**
 * Health Score rápido — solo el score sin todo el detalle
 */
const getHealthScore = async () => maintenanceModel.calculateHealthScore();

export default {
  // Existentes
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
  // Nuevos
  getLocks,
  getReplication,
  getPerformanceSchema,
  getMaintenance,
  getHealthScore
};
