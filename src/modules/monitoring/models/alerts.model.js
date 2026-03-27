import connections from "./connections.model.js";
import performance from "./performance.model.js";
import storage from "./storage.model.js";
import locks from "./locks.model.js";
import replication from "./replication.model.js";
import maintenance from "./maintenance.model.js";

/* ─────────────────────────────────────────────
   Cache en memoria para deduplicar alertas.
   En producción sustituir por Redis o tabla DB.
───────────────────────────────────────────── */
const alertCache = new Map(); // alertId → timestamp último disparo

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
    severity,        // "info" | "warning" | "critical"
    category,
    message,
    value: value !== undefined ? value : null,
    threshold: threshold !== undefined ? threshold : null,
    recommendation,
    timestamp: new Date().toISOString(),
    is_new: fired    // false = ya fue disparada antes (dentro del cooldown)
  };
};

/* ─────────────────────────────────────────────
   Evaluadores individuales — cada uno retorna
   0 o más alertas según sus umbrales
───────────────────────────────────────────── */

const checkConnections = async () => {
  const alerts = [];
  const conn = await connections.getConnectionStats();
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

  if (conn.threads_running > 20) {
    alerts.push(buildAlert({
      id: "threads_running_high",
      severity: "warning",
      category: "connections",
      message: `Threads_running elevado: ${conn.threads_running}`,
      value: conn.threads_running,
      threshold: 20,
      recommendation: "Queries lentas ejecutándose en paralelo. Revisa el proceso list."
    }));
  }

  return alerts;
};

const checkBufferPool = async () => {
  const alerts = [];
  const perf = await performance.getGlobalStats();

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

const checkFragmentation = async () => {
  const alerts = [];
  const tables = await storage.getFragmentation();
  const fragmented = tables.filter(t => parseFloat(t.fragmentation) > 30);

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

const checkLocks = async () => {
  const alerts = [];

  try {
    const lockStats = await locks.getLockStats();
    const currentWaits = parseInt(lockStats.Innodb_row_lock_current_waits || 0);
    const avgLockTime = parseInt(lockStats.Innodb_row_lock_time_avg || 0);

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

    if (avgLockTime > 5000) { // > 5 segundos promedio
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

    // Deadlocks
    const deadlockCount = await locks.getDeadlockCount();
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
  } catch { /* locks no disponibles en esta versión */ }

  return alerts;
};

const checkReplication = async () => {
  const alerts = [];

  try {
    const replica = await replication.getReplicaStatus();
    if (!replica) return alerts; // No es réplica

    if (replica.replica_io_running !== "Yes") {
      alerts.push(buildAlert({
        id: "replica_io_stopped",
        severity: "critical",
        category: "replication",
        message: "Replica IO Thread detenido",
        value: replica.replica_io_running,
        threshold: "Yes",
        recommendation: `Error de IO: ${replica.last_io_error || "Revisa conectividad con source"}. Ejecuta START REPLICA IO_THREAD.`
      }));
    }

    if (replica.replica_sql_running !== "Yes") {
      alerts.push(buildAlert({
        id: "replica_sql_stopped",
        severity: "critical",
        category: "replication",
        message: "Replica SQL Thread detenido",
        value: replica.replica_sql_running,
        threshold: "Yes",
        recommendation: `Error SQL: ${replica.last_sql_error || "Revisa errores de replicación"}. Ejecuta START REPLICA SQL_THREAD.`
      }));
    }

    const lag = parseInt(replica.seconds_behind_source || 0);
    if (lag > 60) {
      alerts.push(buildAlert({
        id: "replication_lag_critical",
        severity: "critical",
        category: "replication",
        message: `Replication lag crítico: ${lag}s`,
        value: lag,
        threshold: 60,
        recommendation: "La réplica está muy atrás. Verifica carga en source y capacidad de red."
      }));
    } else if (lag > 10) {
      alerts.push(buildAlert({
        id: "replication_lag_warning",
        severity: "warning",
        category: "replication",
        message: `Replication lag: ${lag}s`,
        value: lag,
        threshold: 10,
        recommendation: "Lag creciente. Monitorea tendencia."
      }));
    }
  } catch { /* sin permisos de réplica */ }

  return alerts;
};

/* ─────────────────────────────────────────────
   Función principal — corre todos los checks
───────────────────────────────────────────── */
const getAlerts = async () => {
  const results = await Promise.allSettled([
    checkConnections(),
    checkBufferPool(),
    checkFragmentation(),
    checkLocks(),
    checkReplication()
  ]);

  const alerts = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value);

  // Ordenar: critical primero, luego warning, luego info
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

export default {
  getAlerts
};
