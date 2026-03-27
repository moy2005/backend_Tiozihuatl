import { poolPromise } from "../../../config/db.config.js";

/**
 * Top consultas más costosas desde performance_schema.
 * Devuelve el patrón normalizado (digest), no instancias individuales.
 */
const getTopSlowQueries = async (limit = 20, minAvgMs = 10) => {
  const minAvgPico = minAvgMs * 1e9; // ms → picosegundos (unidad interna MySQL)

  const [rows] = await poolPromise.query(`
    SELECT
      digest,
      LEFT(digest_text, 400)                             AS query_pattern,
      schema_name                                         AS db_name,
      count_star                                          AS executions,
      ROUND(avg_timer_wait / 1e9, 2)                     AS avg_ms,
      ROUND(max_timer_wait / 1e9, 2)                     AS max_ms,
      ROUND(min_timer_wait / 1e9, 2)                     AS min_ms,
      ROUND(sum_timer_wait  / 1e9, 2)                    AS total_ms,
      sum_rows_examined                                   AS total_rows_examined,
      sum_rows_sent                                       AS total_rows_sent,
      ROUND(sum_rows_examined / NULLIF(count_star,0))    AS avg_rows_examined,
      ROUND(sum_rows_sent     / NULLIF(count_star,0))    AS avg_rows_sent,
      sum_no_index_used                                   AS full_scans,
      sum_no_good_index_used                             AS bad_index_uses,
      first_seen,
      last_seen
    FROM performance_schema.events_statements_summary_by_digest
    WHERE avg_timer_wait > ?
      AND digest_text NOT LIKE '%performance_schema%'
    ORDER BY avg_timer_wait DESC
    LIMIT ?
  `, [minAvgPico, limit]);

  return rows;
};

/**
 * Índices que nunca han sido utilizados desde el último restart.
 * Candidatos a eliminar para reducir overhead en escrituras.
 */
const getUnusedIndexes = async () => {
  const [rows] = await poolPromise.query(`
    SELECT
      t.object_schema  AS db_name,
      t.object_name    AS table_name,
      t.index_name,
      t.count_star     AS total_accesses,
      s.index_type,
      s.non_unique,
      s.seq_in_index,
      s.column_name
    FROM performance_schema.table_io_waits_summary_by_index_usage t
    JOIN information_schema.statistics s
      ON  s.table_schema = t.object_schema
      AND s.table_name   = t.object_name
      AND s.index_name   = t.index_name
    WHERE t.object_schema = ?
      AND t.index_name    IS NOT NULL
      AND t.index_name   != 'PRIMARY'
      AND t.count_star    = 0
    ORDER BY t.object_name, t.index_name
  `, [process.env.DB_NAME]);

  return rows;
};

/**
 * Top tablas con más I/O (lecturas + escrituras).
 * Útil para detectar hot spots.
 */
const getTopTablesByIO = async (limit = 15) => {
  const [rows] = await poolPromise.query(`
    SELECT
      object_schema   AS db_name,
      object_name     AS table_name,
      count_read      AS total_reads,
      count_write     AS total_writes,
      count_fetch     AS fetches,
      count_insert    AS inserts,
      count_update    AS updates,
      count_delete    AS deletes,
      count_read + count_write AS total_ops
    FROM performance_schema.table_io_waits_summary_by_table
    WHERE object_schema = ?
      AND (count_read + count_write) > 0
    ORDER BY total_ops DESC
    LIMIT ?
  `, [process.env.DB_NAME, limit]);

  return rows;
};

/**
 * Métricas extendidas de InnoDB y servidor desde GLOBAL STATUS.
 * Complementa al performance.model.js original.
 */
const getExtendedGlobalStats = async () => {
  const variables = [
    "Innodb_row_lock_waits",
    "Innodb_row_lock_time",
    "Innodb_row_lock_time_avg",
    "Innodb_row_lock_time_max",
    "Innodb_row_lock_current_waits",
    "Innodb_pages_read",
    "Innodb_pages_written",
    "Innodb_pages_created",
    "Innodb_os_log_written",
    "Innodb_buffer_pool_wait_free",
    "Innodb_log_waits",
    "Com_commit",
    "Com_rollback",
    "Com_begin",
    "Aborted_connects",
    "Aborted_clients",
    "Connection_errors_max_connections",
    "Table_open_cache_hits",
    "Table_open_cache_misses",
    "Table_open_cache_overflows",
    "Sort_merge_passes",
    "Created_tmp_disk_tables",
    "Created_tmp_tables",
    "Select_full_join",
    "Select_scan",
    "Handler_read_rnd_next"
  ];

  // 🔥 construir string manual
const inClause = variables.map(v => `'${v}'`).join(",");

const [rows] = await poolPromise.query(`
  SHOW GLOBAL STATUS WHERE variable_name IN (${inClause})
`);

  const result = {};
  rows.forEach(r => {
    result[r.Variable_name] = isNaN(r.Value)
      ? r.Value
      : parseInt(r.Value);
  });

  return result;
};

/**
 * Verifica si performance_schema está habilitado
 */
const isPerformanceSchemaEnabled = async () => {
  const [rows] = await poolPromise.query(
    `SHOW VARIABLES LIKE 'performance_schema'`
  );
  return rows[0]?.Value === "ON";
};

export default {
  getTopSlowQueries,
  getUnusedIndexes,
  getTopTablesByIO,
  getExtendedGlobalStats,
  isPerformanceSchemaEnabled
};
