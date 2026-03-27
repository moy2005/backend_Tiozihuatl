import { poolPromise } from "../../../config/db.config.js";

/**
 * Tablas candidatas a OPTIMIZE TABLE.
 * Criterio: data_free > 100MB O fragmentación > 20%
 */
const getOptimizeCandidates = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT
      table_name,
      engine,
      table_rows,
      ROUND(data_length   / 1024 / 1024, 2) AS data_mb,
      ROUND(index_length  / 1024 / 1024, 2) AS index_mb,
      ROUND(data_free     / 1024 / 1024, 2) AS wasted_mb,
      ROUND(data_free / NULLIF(data_length + index_length, 0) * 100, 2) AS fragmentation_pct,
      ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb
    FROM information_schema.tables
    WHERE table_schema = ?
      AND engine = 'InnoDB'
      AND (
        data_free > 104857600                                   -- > 100 MB desperdiciado
        OR data_free / NULLIF(data_length + index_length, 0) > 0.20  -- > 20% fragmentado
      )
    ORDER BY wasted_mb DESC
  `, [process.env.DB_NAME]);

  return rows;
};

/**
 * Tablas cuyas estadísticas están desactualizadas.
 * Candidatas a ANALYZE TABLE para mejorar el query planner.
 */
const getAnalyzeCandidates = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT
      table_name,
      table_rows,
      ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb,
      create_time,
      update_time,
      check_time,
      -- Nunca analizada O sin actividad registrada = sospechosa
      CASE
        WHEN check_time IS NULL THEN 'Nunca analizada'
        WHEN check_time < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'Desactualizada (>7 días)'
        ELSE 'Reciente'
      END AS analyze_status
    FROM information_schema.tables
    WHERE table_schema = ?
      AND engine = 'InnoDB'
      AND table_rows > 1000
    ORDER BY table_rows DESC
  `, [process.env.DB_NAME]);

  return rows;
};

/**
 * Health Score global de la base de datos (0–100).
 * Cada métrica penaliza el score según severidad.
 */
const calculateHealthScore = async () => {
  const penalties = [];
  let score = 100;

  // 1. Buffer Pool Hit Ratio
  try {
    const [bpRows] = await poolPromise.execute(`
      SHOW GLOBAL STATUS WHERE variable_name IN (
        'Innodb_buffer_pool_read_requests',
        'Innodb_buffer_pool_reads'
      )
    `);
    const bpMap = {};
    bpRows.forEach(r => (bpMap[r.Variable_name] = parseInt(r.Value)));
    const hits = bpMap.Innodb_buffer_pool_read_requests || 1;
    const reads = bpMap.Innodb_buffer_pool_reads || 0;
    const bpRatio = (1 - reads / hits) * 100;

    if (bpRatio < 85) {
      score -= 25;
      penalties.push({ metric: "buffer_pool_hit_ratio", value: bpRatio.toFixed(2), penalty: 25, severity: "critical" });
    } else if (bpRatio < 95) {
      score -= 10;
      penalties.push({ metric: "buffer_pool_hit_ratio", value: bpRatio.toFixed(2), penalty: 10, severity: "warning" });
    }
  } catch { /* continuar */ }

  // 2. Conexiones
  try {
    const [maxRows] = await poolPromise.execute(`SHOW VARIABLES LIKE 'max_connections'`);
    const [usedRows] = await poolPromise.execute(`SHOW STATUS LIKE 'Threads_connected'`);
    const maxConn = parseInt(maxRows[0]?.Value || 1);
    const used = parseInt(usedRows[0]?.Value || 0);
    const usagePct = (used / maxConn) * 100;

    if (usagePct > 90) {
      score -= 20;
      penalties.push({ metric: "connection_usage_pct", value: usagePct.toFixed(2), penalty: 20, severity: "critical" });
    } else if (usagePct > 75) {
      score -= 10;
      penalties.push({ metric: "connection_usage_pct", value: usagePct.toFixed(2), penalty: 10, severity: "warning" });
    }
  } catch { /* continuar */ }

  // 3. Row lock waits activos
  try {
    const [lockRows] = await poolPromise.execute(`
      SHOW STATUS LIKE 'Innodb_row_lock_current_waits'
    `);
    const lockWaits = parseInt(lockRows[0]?.Value || 0);

    if (lockWaits > 10) {
      score -= 20;
      penalties.push({ metric: "row_lock_current_waits", value: lockWaits, penalty: 20, severity: "critical" });
    } else if (lockWaits > 3) {
      score -= 8;
      penalties.push({ metric: "row_lock_current_waits", value: lockWaits, penalty: 8, severity: "warning" });
    }
  } catch { /* continuar */ }

  // 4. Full table scans (Select_full_join = JOINs sin índice)
  try {
    const [scanRows] = await poolPromise.execute(`
      SHOW STATUS LIKE 'Select_full_join'
    `);
    const fullJoins = parseInt(scanRows[0]?.Value || 0);

    if (fullJoins > 1000) {
      score -= 15;
      penalties.push({ metric: "select_full_join", value: fullJoins, penalty: 15, severity: "warning" });
    }
  } catch { /* continuar */ }

  // 5. Temp tables en disco
  try {
    const [tmpRows] = await poolPromise.execute(`
      SHOW STATUS WHERE variable_name IN ('Created_tmp_disk_tables', 'Created_tmp_tables')
    `);
    const tmpMap = {};
    tmpRows.forEach(r => (tmpMap[r.Variable_name] = parseInt(r.Value)));
    const totalTmp = (tmpMap.Created_tmp_tables || 0) + (tmpMap.Created_tmp_disk_tables || 0);
    const diskRatio = totalTmp > 0 ? (tmpMap.Created_tmp_disk_tables / totalTmp) * 100 : 0;

    if (diskRatio > 25) {
      score -= 10;
      penalties.push({ metric: "tmp_disk_ratio_pct", value: diskRatio.toFixed(2), penalty: 10, severity: "warning" });
    }
  } catch { /* continuar */ }

  // 6. Aborted connections
  try {
    const [abortRows] = await poolPromise.execute(`
      SHOW STATUS WHERE variable_name IN ('Aborted_connects', 'Aborted_clients')
    `);
    const abortMap = {};
    abortRows.forEach(r => (abortMap[r.Variable_name] = parseInt(r.Value)));
    const abortTotal = (abortMap.Aborted_connects || 0) + (abortMap.Aborted_clients || 0);

    if (abortTotal > 500) {
      score -= 10;
      penalties.push({ metric: "aborted_connections", value: abortTotal, penalty: 10, severity: "warning" });
    }
  } catch { /* continuar */ }

  const finalScore = Math.max(0, score);

  return {
    score: finalScore,
    grade: finalScore >= 90 ? "A" : finalScore >= 75 ? "B" : finalScore >= 60 ? "C" : finalScore >= 40 ? "D" : "F",
    status: finalScore >= 90 ? "healthy" : finalScore >= 75 ? "good" : finalScore >= 60 ? "warning" : "critical",
    penalties,
    calculated_at: new Date().toISOString()
  };
};

export default {
  getOptimizeCandidates,
  getAnalyzeCandidates,
  calculateHealthScore
};
