import { poolAdmin } from "../../../config/dbPools/poolAdmin.config.js";
import { poolBackup } from "../../../config/dbPools/poolBackup.config.js";
import { poolOperacion } from "../../../config/dbPools/poolOperacion.config.js";

/* ===============================
   ESTADO GENERAL DE LA BASE DE DATOS
================================ */

const getDatabaseStatus = async () => {
  const [rows] = await poolAdmin.execute(`
    SELECT
      table_schema                                  AS db_name,
      COUNT(*)                                      AS total_tables,
      SUM(table_rows)                               AS total_rows,
      SUM(data_length + index_length)               AS total_size_bytes,
      ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_size_mb
    FROM information_schema.tables
    WHERE table_schema = ?
    GROUP BY table_schema
  `, [process.env.DB_NAME]);
  return rows[0] ?? null;
};

const getDatabaseEngines = async () => {
  const [rows] = await poolAdmin.execute(`
    SELECT engine, COUNT(*) AS total
    FROM information_schema.tables
    WHERE table_schema = ? AND table_type = 'BASE TABLE'
    GROUP BY engine
  `, [process.env.DB_NAME]);
  return rows;
};


/* ===============================
   TAMAÑO Y TABLAS
================================ */

const getTablesSizeDetail = async () => {
  const [rows] = await poolAdmin.execute(`
    SELECT
      table_name      AS nombre,
      table_rows      AS rows_estimate,
      ROUND(data_length / 1024 / 1024, 4)                            AS data_mb,
      ROUND(index_length / 1024 / 1024, 4)                           AS index_mb,
      ROUND((data_length + index_length) / 1024 / 1024, 4)          AS total_mb,
      engine          AS motor,
      table_collation AS colacion,
      create_time     AS creado,
      update_time     AS actualizado
    FROM information_schema.tables
    WHERE table_schema = ?
    ORDER BY (data_length + index_length) DESC
  `, [process.env.DB_NAME]);
  return rows;
};


/* ===============================
   ÍNDICES
================================ */

const getIndexesDetail = async () => {
  const [rows] = await poolAdmin.execute(`
    SELECT
      s.table_name   AS tabla,
      s.index_name   AS indice,
      s.column_name  AS columna,
      s.non_unique   AS no_unico,
      s.seq_in_index AS seq,
      s.index_type   AS tipo,
      s.cardinality  AS cardinalidad,
      ROUND(t.index_length / 1024 / 1024, 4) AS index_mb
    FROM information_schema.statistics s
    JOIN information_schema.tables t
      ON t.table_schema = s.table_schema
     AND t.table_name  = s.table_name
    WHERE s.table_schema = ?
    ORDER BY s.table_name, s.index_name, s.seq_in_index
  `, [process.env.DB_NAME]);
  return rows;
};


/* ===============================
   CONEXIONES
================================ */

const getConnectionStats = async () => {
  const [maxConn]  = await poolBackup.execute(`SHOW VARIABLES LIKE 'max_connections'`);
  const [usedConn] = await poolBackup.execute(`SHOW STATUS  LIKE 'Threads_connected'`);
  const [runConn]  = await poolBackup.execute(`SHOW STATUS  LIKE 'Threads_running'`);
  const [maxUsed]  = await poolBackup.execute(`SHOW STATUS  LIKE 'Max_used_connections'`);

  return {
    max_connections:      parseInt(maxConn[0]?.Value  ?? 0),
    threads_connected:    parseInt(usedConn[0]?.Value ?? 0),
    threads_running:      parseInt(runConn[0]?.Value  ?? 0),
    max_used_connections: parseInt(maxUsed[0]?.Value  ?? 0),
  };
};

const getActiveProcessList = async () => {
  const [rows] = await poolBackup.execute(`SHOW FULL PROCESSLIST`);
  return rows;
};


/* ===============================
   CONSULTAS ACTIVAS
================================ */

const getActiveQueries = async () => {
  const [rows] = await poolBackup.execute(`
    SELECT
      id, user, host, db,
      command, time, state,
      LEFT(info, 500) AS info
    FROM information_schema.processlist
    WHERE command != 'Sleep'
      AND db = ?
    ORDER BY time DESC
  `, [process.env.DB_NAME]);
  return rows;
};


/* ===============================
   CONSULTAS LENTAS
================================ */

const getSlowQueryStats = async () => {
  const [enabled]  = await poolBackup.execute(`SHOW VARIABLES LIKE 'slow_query_log'`);
  const [longTime] = await poolBackup.execute(`SHOW VARIABLES LIKE 'long_query_time'`);
  const [count]    = await poolBackup.execute(`SHOW STATUS  LIKE 'Slow_queries'`);

  return {
    slow_query_log:  enabled[0]?.Value  ?? "OFF",
    long_query_time: longTime[0]?.Value ?? null,
    slow_queries:    parseInt(count[0]?.Value ?? 0),
  };
};


/* ===============================
   RENDIMIENTO / ACTIVIDAD POR TABLA
================================ */

const getTableIOStats = async () => {
  const [rows] = await poolBackup.execute(`
    SELECT
      object_schema,
      object_name,
      count_read,
      count_write,
      count_fetch,
      count_insert,
      count_update,
      count_delete
    FROM performance_schema.table_io_waits_summary_by_table
    WHERE object_schema = ?
    ORDER BY count_read + count_write DESC
    LIMIT 30
  `, [process.env.DB_NAME]);
  return rows;
};

const getGlobalPerformanceVars = async () => {
  const varsToFetch = [
    "Queries", "Questions", "Com_select", "Com_insert",
    "Com_update", "Com_delete", "Uptime", "Innodb_buffer_pool_read_requests",
    "Innodb_buffer_pool_reads", "Key_reads", "Key_read_requests"
  ];
  const placeholders = varsToFetch.map(() => "?").join(", ");
  const [rows] = await poolBackup.execute(
    `SHOW GLOBAL STATUS WHERE variable_name IN (${placeholders})`,
    varsToFetch
  );
  return rows.reduce((acc, r) => {
    acc[r.Variable_name] = r.Value;
    return acc;
  }, {});
};


/* ===============================
   CRECIMIENTO DE TABLAS
================================ */

const getGrowthByTable = async () => {
  const [rows] = await poolAdmin.execute(`
    SELECT
      table_name  AS nombre,
      table_rows  AS rows_estimate,
      ROUND(data_length / 1024 / 1024, 4)                        AS data_mb,
      ROUND(index_length / 1024 / 1024, 4)                       AS index_mb,
      ROUND((data_length + index_length) / 1024 / 1024, 4)      AS total_mb,
      create_time AS creado,
      update_time AS actualizado
    FROM information_schema.tables
    WHERE table_schema = ?
    ORDER BY table_rows DESC
  `, [process.env.DB_NAME]);
  return rows;
};


/* ===============================
   SEGURIDAD – AUDITORÍA
================================ */

const getAuditEvents = async ({ limit = 100, offset = 0, userId = null, action = null } = {}) => {
  // mysql2 no acepta ? para LIMIT/OFFSET en prepared statements — se interpolan como enteros
  const safeLimit  = parseInt(limit,  10) || 100;
  const safeOffset = parseInt(offset, 10) || 0;

  let query = `
    SELECT *
    FROM auditoriaeventos
    WHERE 1 = 1
  `;
  const params = [];

  if (userId) { query += ` AND id_usuario  = ?`; params.push(parseInt(userId, 10)); }
  if (action)  { query += ` AND tipo_evento = ?`; params.push(String(action)); }

  query += ` ORDER BY fecha_evento DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

  const [rows] = await poolOperacion.execute(query, params);
  return rows;
};

const getAuditEventCount = async ({ userId = null, action = null } = {}) => {
  let query = `SELECT COUNT(*) AS total FROM auditoriaeventos WHERE 1 = 1`;
  const params = [];

  if (userId) { query += ` AND id_usuario  = ?`; params.push(parseInt(userId, 10)); }
  if (action)  { query += ` AND tipo_evento = ?`; params.push(String(action)); }

  const [rows] = await poolOperacion.execute(query, params);
  return rows[0]?.total ?? 0;
};

/* ===============================
   SEGURIDAD – SESIONES ACTIVAS
================================ */

const getActiveSessions = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      s.id_sesion,
      s.id_usuario,
      u.nombre,
      u.a_paterno,
      u.a_materno,
      u.correo,
      s.ip_origen,
      s.dispositivo,
      s.fecha_inicio,
      s.fecha_cierre
    FROM sesionesjwt s
    JOIN usuarios u ON u.id_usuario = s.id_usuario
    WHERE s.fecha_cierre IS NULL
    ORDER BY s.fecha_inicio DESC
    LIMIT 50
  `);
  return rows;
};

const getActiveSessionCount = async () => {
  const [rows] = await poolOperacion.execute(
    `SELECT COUNT(*) AS total FROM sesionesjwt WHERE fecha_cierre IS NULL`
  );
  return rows[0]?.total ?? 0;
};


/* ===============================
   SEGURIDAD – TOKENS ACTIVOS
================================ */

const getActiveTokens = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      t.id_token,
      t.id_usuario,
      u.nombre,
      u.a_paterno,
      u.a_materno,
      u.correo,
      t.dispositivo,
      t.ip_origen,
      t.fecha_emision,
      t.fecha_expiracion,
      t.estado
    FROM tokensrefresh t
    JOIN usuarios u ON u.id_usuario = t.id_usuario
    WHERE t.fecha_expiracion > NOW()
      AND t.estado = 'activo'
    ORDER BY t.fecha_emision DESC
  `);
  return rows;
};

const getActiveTokenCount = async () => {
  const [rows] = await poolOperacion.execute(
    `SELECT COUNT(*) AS total FROM tokensrefresh WHERE fecha_expiracion > NOW() AND estado = 'activo'`
  );
  return rows[0]?.total ?? 0;
};


/* ===============================
   BACKUPS – HISTORIAL
================================ */

const getBackupHistory = async ({ limit = 50, offset = 0 } = {}) => {
  const [rows] = await poolOperacion.execute(
    `SELECT * FROM backups_log ORDER BY fecha DESC LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );
  return rows;
};

const getLastBackup = async () => {
  const [rows] = await poolOperacion.execute(
    `SELECT * FROM backups_log ORDER BY fecha DESC LIMIT 1`
  );
  return rows[0] ?? null;
};


/* ===============================
   TAREAS PROGRAMADAS (eventos MySQL)
================================ */

const getScheduledJobs = async () => {
  const [rows] = await poolAdmin.execute(`
    SELECT
      event_name,
      event_schema,
      status,
      event_type,
      execute_at,
      interval_value,
      interval_field,
      starts,
      ends,
      last_executed,
      event_comment,
      definer
    FROM information_schema.events
    WHERE event_schema = ?
    ORDER BY event_name
  `, [process.env.DB_NAME]);
  return rows;
};


/* ===============================
   DASHBOARD – RESUMEN GENERAL
================================ */

const getDashboardSummary = async () => {
 const [
    dbStatus,
    connStats,
    slowStats,
    lastBackup,
    sessionCount,
    tokenCount,
    systemActivity,
    libraryStats,
    salesStats
  ] = await Promise.all([
    getDatabaseStatus(),
    getConnectionStats(),
    getSlowQueryStats(),
    getLastBackup(),
    getActiveSessionCount(),
    getActiveTokenCount(),
    getSystemActivity(),
    getLibraryStats(),
    getSalesStats()
  ]);

  return {
    database:    dbStatus,
    connections: connStats,
    slow_queries: slowStats,
    last_backup:  lastBackup,
    active_sessions: sessionCount,
    active_tokens:   tokenCount,
    system_activity: systemActivity,
    library_stats:   libraryStats,
    sales_stats:     salesStats
  };
};


/* ===============================
   ANÁLISIS – TOP TABLAS POR VOLUMEN Y ACTIVIDAD
================================ */

// Tablas con más producción: filas + tamaño + fragmentación
const getTopTablesByVolume = async () => {
  const [rows] = await poolAdmin.execute(`
    SELECT
      table_name     AS nombre,
      table_rows     AS filas_estimadas,
      ROUND(data_length / 1024 / 1024, 4)                      AS data_mb,
      ROUND(index_length / 1024 / 1024, 4)                     AS index_mb,
      ROUND((data_length + index_length) / 1024 / 1024, 4)    AS total_mb,
      ROUND(data_free / 1024 / 1024, 4)                        AS fragmentado_mb,
      engine         AS motor,
      create_time    AS creado,
      update_time    AS ultima_escritura,
      avg_row_length AS bytes_por_fila
    FROM information_schema.tables
    WHERE table_schema = ?
      AND table_type   = 'BASE TABLE'
    ORDER BY data_length + index_length DESC
    LIMIT 20
  `, [process.env.DB_NAME]);
  return rows;
};

// Tablas más activas por I/O (requiere performance_schema)
const getTableActivity = async () => {
  try {
    const [rows] = await poolBackup.execute(`
      SELECT
        object_name              AS tabla,
        count_read               AS lecturas,
        count_write              AS escrituras,
        count_fetch              AS fetchs,
        count_insert             AS inserts,
        count_update             AS updates,
        count_delete             AS deletes,
        count_read + count_write AS total_ops
      FROM performance_schema.table_io_waits_summary_by_table
      WHERE object_schema = ?
        AND (count_read + count_write) > 0
      ORDER BY count_read + count_write DESC
      LIMIT 20
    `, [process.env.DB_NAME]);
    return { available: true, data: rows };
  } catch {
    return { available: false, data: [] };
  }
};

// Tablas más lentas por tiempo de espera promedio
const getTableWaitTimes = async () => {
  try {
    const [rows] = await poolBackup.execute(`
      SELECT
        object_name                              AS tabla,
        count_read + count_write                 AS total_ops,
        ROUND(sum_timer_wait   / 1e12, 4)        AS tiempo_total_s,
        ROUND(avg_timer_wait   / 1e9,  4)        AS promedio_ms,
        ROUND(max_timer_wait   / 1e9,  4)        AS maximo_ms,
        ROUND(sum_timer_read   / 1e12, 4)        AS tiempo_lectura_s,
        ROUND(sum_timer_write  / 1e12, 4)        AS tiempo_escritura_s
      FROM performance_schema.table_io_waits_summary_by_table
      WHERE object_schema = ?
        AND count_read + count_write > 0
      ORDER BY avg_timer_wait DESC
      LIMIT 20
    `, [process.env.DB_NAME]);
    return { available: true, data: rows };
  } catch {
    return { available: false, data: [] };
  }
};

// Análisis de índices: sin usar, tablas sin PK, tablas sin índice
const getIndexAnalysis = async () => {
  let unusedIndexes = [];
  let perfAvailable = true;

  try {
    const [unused] = await poolBackup.execute(`
      SELECT
        object_name  AS tabla,
        index_name   AS indice
      FROM performance_schema.table_io_waits_summary_by_index_usage
      WHERE object_schema = ?
        AND index_name IS NOT NULL
        AND index_name != 'PRIMARY'
        AND count_star = 0
      ORDER BY object_name, index_name
    `, [process.env.DB_NAME]);
    unusedIndexes = unused;
  } catch {
    perfAvailable = false;
  }

  const [noPK] = await poolAdmin.execute(`
    SELECT t.table_name AS tabla
    FROM information_schema.tables t
    LEFT JOIN information_schema.table_constraints tc
      ON  tc.table_schema    = t.table_schema
      AND tc.table_name      = t.table_name
      AND tc.constraint_type = 'PRIMARY KEY'
    WHERE t.table_schema     = ?
      AND t.table_type       = 'BASE TABLE'
      AND tc.constraint_name IS NULL
  `, [process.env.DB_NAME]);

  const [noIndex] = await poolAdmin.execute(`
    SELECT t.table_name AS tabla
    FROM information_schema.tables t
    LEFT JOIN information_schema.statistics s
      ON  s.table_schema = t.table_schema
      AND s.table_name   = t.table_name
    WHERE t.table_schema = ?
      AND t.table_type   = 'BASE TABLE'
      AND s.index_name IS NULL
  `, [process.env.DB_NAME]);

  return {
    perf_available:       perfAvailable,
    unused_indexes:       unusedIndexes,
    tables_without_pk:    noPK,
    tables_without_index: noIndex,
  };
};

// Salud de tablas: fragmentación + tablas frías (sin escrituras recientes)
const getTableHealth = async () => {
  const [rows] = await poolAdmin.execute(`
    SELECT
      table_name   AS nombre,
      table_rows   AS filas_estimadas,
      ROUND(data_length / 1024 / 1024, 4)                          AS data_mb,
      ROUND(data_free   / 1024 / 1024, 4)                          AS fragmentado_mb,
      ROUND(
        data_free / NULLIF(data_length + index_length, 0) * 100
      , 1)                                                          AS pct_fragmentacion,
      engine       AS motor,
      update_time  AS ultima_escritura,
      create_time  AS creado,
      DATEDIFF(NOW(), update_time)                                   AS dias_sin_escribir
    FROM information_schema.tables
    WHERE table_schema = ?
      AND table_type   = 'BASE TABLE'
    ORDER BY COALESCE(update_time, create_time) ASC
    LIMIT 20
  `, [process.env.DB_NAME]);
  return rows;
};


const getSystemActivity = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
      (SELECT COUNT(*) FROM prestamos WHERE estado='Activo') AS prestamos_activos,
      (SELECT COUNT(*) FROM compras WHERE created_at >= NOW() - INTERVAL 1 DAY) AS compras_24h,
      (SELECT COUNT(*) FROM auditoriaeventos WHERE fecha_evento >= NOW() - INTERVAL 1 DAY) AS eventos_24h,
      (SELECT COUNT(*) FROM sesionesjwt WHERE fecha_cierre IS NULL) AS sesiones_activas
  `);

  return rows[0];
};

const getLibraryStats = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      (SELECT COUNT(*) FROM libros WHERE activo = 1) AS libros_activos,
      (SELECT COUNT(*) FROM prestamos WHERE estado='Activo') AS prestamos_activos,
      (SELECT COUNT(*) FROM prestamos WHERE estado='Vencido') AS prestamos_vencidos,
      (SELECT COUNT(*) FROM libro_formatos WHERE tipo='DIGITAL') AS libros_digitales,
      (SELECT COUNT(*) FROM libro_formatos WHERE tipo='FISICO') AS libros_fisicos
  `);

  return rows[0];
};


const getMostBorrowedBooks = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      l.titulo,
      COUNT(p.id_prestamo) AS total_prestamos
    FROM prestamos p
    JOIN libros l ON l.id = p.libro_id
    GROUP BY l.id
    ORDER BY total_prestamos DESC
    LIMIT 10
  `);

  return rows;
};


const getSalesStats = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      (SELECT COUNT(*) FROM revistas) AS total_revistas,
      (SELECT COUNT(*) FROM compras) AS total_compras,
      (SELECT SUM(total) FROM compras WHERE estado='pagado') AS ingresos_totales,
      (SELECT COUNT(*) FROM compras WHERE estado='pendiente') AS compras_pendientes
  `);

  return rows[0];
};


const getTopSellingMagazines = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      r.titulo,
      COUNT(dc.id_revista) AS ventas
    FROM detalle_compra dc
    JOIN revistas r ON r.id_revista = dc.id_revista
    GROUP BY r.id_revista
    ORDER BY ventas DESC
    LIMIT 10
  `);

  return rows;
};

const getUsersByRole = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      r.nombre_rol,
      COUNT(u.id_usuario) AS total
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.id_rol
    GROUP BY r.id_rol
  `);

  return rows;
};


const getMostActiveUsers = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      u.nombre,
      u.correo,
      COUNT(a.id_evento) AS eventos
    FROM auditoriaeventos a
    JOIN usuarios u ON u.id_usuario = a.id_usuario
    GROUP BY u.id_usuario
    ORDER BY eventos DESC
    LIMIT 10
  `);

  return rows;
};

const getAcademicStats = async () => {
  const [rows] = await poolOperacion.execute(`
    SELECT
      (SELECT COUNT(*) FROM carreras WHERE estado='Activa') AS carreras_activas,
      (SELECT COUNT(*) FROM semestres) AS total_semestres,
      (SELECT COUNT(*) FROM trayectoria_academica WHERE estado='Activo') AS alumnos_activos
  `);

  return rows[0];
};



export default {
  // Status
  getDatabaseStatus,
  getDatabaseEngines,
  // Tables & indexes
  getTablesSizeDetail,
  getIndexesDetail,
  // Connections
  getConnectionStats,
  getActiveProcessList,
  // Queries
  getActiveQueries,
  getSlowQueryStats,
  // Performance
  getTableIOStats,
  getGlobalPerformanceVars,
  // Growth
  getGrowthByTable,
  // Análisis
  getTopTablesByVolume,
  getTableActivity,
  getTableWaitTimes,
  getIndexAnalysis,
  getTableHealth,
  // Security
  getAuditEvents,
  getAuditEventCount,
  getActiveSessions,
  getActiveSessionCount,
  getActiveTokens,
  getActiveTokenCount,
  // Backups
  getBackupHistory,
  getLastBackup,
  // Jobs
  getScheduledJobs,
  // Dashboard
  getDashboardSummary,
  getSystemActivity,
  getLibraryStats,
  getSalesStats,
  getTopSellingMagazines,
  getUsersByRole,
  getMostActiveUsers,
  getAcademicStats,
  getMostBorrowedBooks
};