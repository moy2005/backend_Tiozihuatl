import connections from "./connections.model.js";
import performance from "./performance.model.js";
import storage from "./storage.model.js";
import locks from "./locks.model.js";

/* ─────────────────────────────────────────────────────────────
   Cache en memoria para deduplicar alertas.
   En producción sustituir por Redis o tabla DB.
───────────────────────────────────────────────────────────── */
const alertCache = new Map();

const shouldFire = (alertId, cooldownMinutes = 30) => {
  const last = alertCache.get(alertId);
  if (!last) return true;
  return Date.now() - last > cooldownMinutes * 60 * 1000;
};

const buildAlert = ({ id, severity, category, message, value, threshold, recommendation }) => {
  const fired = shouldFire(id);
  if (fired) alertCache.set(id, Date.now());

  return {
    id,
    severity,
    category,
    message,
    value: value !== undefined ? value : null,
    threshold: threshold !== undefined ? threshold : null,
    recommendation,
    timestamp: new Date().toISOString(),
    is_new: fired
  };
};

const buildAlertsResponse = (groups) => {
  const alerts = groups.flat();
  const severityOrder = { critical: 0, warning: 1, info: 2 };

  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === "critical").length,
    warning: alerts.filter(a => a.severity === "warning").length,
    info: alerts.filter(a => a.severity === "info").length,
    alerts,
    evaluated_at: new Date().toISOString()
  };
};

const checkConnectionsFromStats = (conn) => {
  if (!conn) return [];

  const alerts = [];
  const pct = parseFloat(conn.usage_percent);

  if (pct > 90) {
    alerts.push(buildAlert({
      id: "conn_critical",
      severity: "critical",
      category: "connections",
      message: `Uso de conexiones crítico: ${pct}%`,
      value: pct,
      threshold: 90,
      recommendation: "Revisa connection pooling. Considera aumentar max_connections o reducir conexiones inactivas."
    }));
  } else if (pct > 75) {
    alerts.push(buildAlert({
      id: "conn_warning",
      severity: "warning",
      category: "connections",
      message: `Alto uso de conexiones: ${pct}%`,
      value: pct,
      threshold: 75,
      recommendation: "Monitorea el crecimiento. Implementa connection pooling si aún no lo tienes."
    }));
  }

  if (Number(conn.threads_running) > 20) {
    alerts.push(buildAlert({
      id: "threads_running_high",
      severity: "warning",
      category: "connections",
      message: `Threads_running elevado: ${conn.threads_running}`,
      value: Number(conn.threads_running),
      threshold: 20,
      recommendation: "Queries lentas ejecutándose en paralelo. Revisa el proceso list."
    }));
  }

  return alerts;
};

const checkBufferPoolFromStats = (perf) => {
  if (!perf) return [];

  const alerts = [];
  const hits = parseInt(perf.Innodb_buffer_pool_read_requests) || 1;
  const reads = parseInt(perf.Innodb_buffer_pool_reads) || 0;
  const ratio = parseFloat(((1 - reads / hits) * 100).toFixed(2));

  if (ratio < 85) {
    alerts.push(buildAlert({
      id: "bp_critical",
      severity: "critical",
      category: "performance",
      message: `Buffer Pool Hit Ratio crítico: ${ratio}%`,
      value: ratio,
      threshold: 85,
      recommendation: "Aumenta innodb_buffer_pool_size. Idealmente debe cubrir el 70-80% del dataset activo."
    }));
  } else if (ratio < 95) {
    alerts.push(buildAlert({
      id: "bp_warning",
      severity: "warning",
      category: "performance",
      message: `Buffer Pool Hit Ratio bajo: ${ratio}%`,
      value: ratio,
      threshold: 95,
      recommendation: "Considera incrementar innodb_buffer_pool_size si hay memoria disponible."
    }));
  }

  return alerts;
};

const checkFragmentationFromTables = (fragmentation = []) => {
  const alerts = [];
  const fragmented = fragmentation.filter(t => parseFloat(t.fragmentation) > 30);

  if (fragmented.length > 5) {
    alerts.push(buildAlert({
      id: "fragmentation_critical",
      severity: "critical",
      category: "storage",
      message: `${fragmented.length} tablas con fragmentación >30%`,
      value: fragmented.length,
      threshold: 5,
      recommendation: `Ejecuta OPTIMIZE TABLE en: ${fragmented.slice(0, 5).map(t => t.table_name).join(", ")}${fragmented.length > 5 ? "..." : ""}`
    }));
  } else if (fragmented.length > 0) {
    alerts.push(buildAlert({
      id: "fragmentation_warning",
      severity: "warning",
      category: "storage",
      message: `${fragmented.length} tabla(s) fragmentada(s)`,
      value: fragmented.length,
      threshold: 1,
      recommendation: `Programa OPTIMIZE TABLE fuera de horario pico para: ${fragmented.map(t => t.table_name).join(", ")}`
    }));
  }

  return alerts;
};

const checkLocksFromSnapshot = (locksData) => {
  if (!locksData) return [];

  const alerts = [];
  const lockStats = locksData.lock_stats ?? locksData;
  const currentWaits = parseInt(lockStats?.Innodb_row_lock_current_waits || 0);
  const avgLockTime = parseInt(lockStats?.Innodb_row_lock_time_avg || 0);
  const deadlockCount = Number.isFinite(locksData.deadlock_count)
    ? locksData.deadlock_count
    : null;

  if (currentWaits > 10) {
    alerts.push(buildAlert({
      id: "locks_critical",
      severity: "critical",
      category: "locks",
      message: `${currentWaits} transacciones esperando por row locks`,
      value: currentWaits,
      threshold: 10,
      recommendation: "Revisa transacciones bloqueadas en /monitoring/locks. Posible deadlock o transacción larga."
    }));
  } else if (currentWaits > 3) {
    alerts.push(buildAlert({
      id: "locks_warning",
      severity: "warning",
      category: "locks",
      message: `${currentWaits} transacciones en espera por locks`,
      value: currentWaits,
      threshold: 3,
      recommendation: "Revisa el proceso de lock waits para identificar la transacción bloqueante."
    }));
  }

  if (avgLockTime > 5000) {
    alerts.push(buildAlert({
      id: "lock_time_high",
      severity: "warning",
      category: "locks",
      message: `Tiempo promedio de lock alto: ${(avgLockTime / 1000).toFixed(1)}s`,
      value: avgLockTime,
      threshold: 5000,
      recommendation: "Las transacciones están reteniendo locks por mucho tiempo. Revisa la lógica de negocio."
    }));
  }

  if (deadlockCount !== null && deadlockCount > 0) {
    alerts.push(buildAlert({
      id: "deadlocks_detected",
      severity: deadlockCount > 10 ? "critical" : "warning",
      category: "locks",
      message: `${deadlockCount} deadlock(s) detectado(s) desde último restart`,
      value: deadlockCount,
      threshold: 0,
      recommendation: "Revisa el último deadlock en /monitoring/locks/deadlock. Asegura orden consistente de acceso a tablas."
    }));
  }

  return alerts;
};

const checkConnections = async () => {
  const conn = await connections.getConnectionStats();
  return checkConnectionsFromStats(conn);
};

const checkBufferPool = async () => {
  const perf = await performance.getGlobalStats();
  return checkBufferPoolFromStats(perf);
};

const checkFragmentation = async () => {
  const tables = await storage.getFragmentation();
  return checkFragmentationFromTables(tables);
};

const checkLocks = async () => {
  try {
    const [lockStats, deadlockCount] = await Promise.all([
      locks.getLockStats(),
      locks.getDeadlockCount()
    ]);

    return checkLocksFromSnapshot({
      lock_stats: lockStats,
      deadlock_count: deadlockCount
    });
  } catch {
    return [];
  }
};

const getAlerts = async () => {
  const results = await Promise.allSettled([
    checkConnections(),
    checkBufferPool(),
    checkFragmentation(),
    checkLocks()
  ]);

  return buildAlertsResponse(
    results
      .filter(result => result.status === "fulfilled")
      .map(result => result.value)
  );
};

const getAlertsFromSnapshot = async (snapshot = {}) => {
  const groups = await Promise.all([
    Promise.resolve(checkConnectionsFromStats(snapshot.connections?.stats ?? snapshot.connectionStats ?? null)),
    Promise.resolve(checkBufferPoolFromStats(snapshot.performance ?? snapshot.performanceStats ?? null)),
    Promise.resolve(checkFragmentationFromTables(snapshot.storage?.fragmentation ?? snapshot.fragmentation ?? [])),
    Promise.resolve(checkLocksFromSnapshot(snapshot.locks ?? null))
  ]);

  return buildAlertsResponse(groups);
};

export default {
  getAlerts,
  getAlertsFromSnapshot
};
