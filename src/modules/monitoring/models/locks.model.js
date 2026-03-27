import { poolPromise } from "../../../config/db.config.js";

/**
 * Obtiene las transacciones actualmente bloqueadas
 * Requiere MySQL 8+ con performance_schema habilitado
 */
const getBlockedTransactions = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT
      r.trx_id AS waiting_trx_id,
      r.trx_mysql_thread_id AS waiting_thread,
      r.trx_query AS waiting_query,
      r.trx_started AS waiting_started,
      TIMESTAMPDIFF(SECOND, r.trx_started, NOW()) AS waiting_seconds,

      b.trx_id AS blocking_trx_id,
      b.trx_mysql_thread_id AS blocking_thread,
      b.trx_query AS blocking_query,
      b.trx_started AS blocking_started

    FROM performance_schema.data_lock_waits w
    JOIN information_schema.innodb_trx b 
      ON b.trx_id = w.blocking_engine_transaction_id
    JOIN information_schema.innodb_trx r 
      ON r.trx_id = w.requesting_engine_transaction_id

    ORDER BY waiting_seconds DESC
  `);

  return rows;
};

/**
 * Obtiene todas las transacciones InnoDB activas
 */
const getActiveTransactions = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT
      trx_id,
      trx_state,
      trx_started,
      TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS duration_seconds,
      trx_requested_lock_id,
      trx_wait_started,
      trx_weight,
      trx_mysql_thread_id,
      trx_query,
      trx_rows_locked,
      trx_rows_modified,
      trx_isolation_level
    FROM information_schema.innodb_trx
    ORDER BY trx_started ASC
  `);
  return rows;
};

/**
 * Métricas de row locks desde GLOBAL STATUS
 */
const getLockStats = async () => {
  const variables = [
    "Innodb_row_lock_waits",
    "Innodb_row_lock_time",
    "Innodb_row_lock_time_avg",
    "Innodb_row_lock_time_max",
    "Innodb_row_lock_current_waits",
    "Table_locks_waited",
    "Table_locks_immediate"
  ];

  const placeholders = variables.map(() => "?").join(",");
  const [rows] = await poolPromise.execute(
    `SHOW GLOBAL STATUS WHERE variable_name IN (${placeholders})`,
    variables
  );

  const result = {};
  rows.forEach(r => (result[r.Variable_name] = r.Value));
  return result;
};

/**
 * Parsea el output de SHOW ENGINE INNODB STATUS para extraer
 * el último deadlock registrado por el motor
 */
const getLastDeadlock = async () => {
  const [rows] = await poolPromise.execute(`SHOW ENGINE INNODB STATUS`);
  const statusText = rows[0]?.Status ?? "";

  // Extraer sección LATEST DETECTED DEADLOCK
  const deadlockMatch = statusText.match(
    /LATEST DETECTED DEADLOCK\n-+\n([\s\S]*?)(?:\n-{3,}|\nTRANSACTIONS)/
  );

  return {
    raw_section: deadlockMatch ? deadlockMatch[1].trim() : null,
    has_deadlock: !!deadlockMatch,
    full_status_available: statusText.length > 0
  };
};

/**
 * Conteo de deadlocks acumulado (MySQL 8.0.11+)
 */
const getDeadlockCount = async () => {
  try {
    const [rows] = await poolPromise.execute(`
      SHOW GLOBAL STATUS LIKE 'Innodb_deadlocks'
    `);

    return parseInt(rows[0]?.Value ?? 0);
  } catch {
    return null;
  }
};

export default {
  getBlockedTransactions,
  getActiveTransactions,
  getLockStats,
  getLastDeadlock,
  getDeadlockCount
};
