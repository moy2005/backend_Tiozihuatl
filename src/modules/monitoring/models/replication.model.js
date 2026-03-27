import { poolPromise } from "../../../config/db.config.js";

/**
 * Estado completo de la réplica.
 * Funciona en MySQL 8+ (usa REPLICA STATUS) con fallback a SLAVE STATUS.
 */
const getReplicaStatus = async () => {
  let rows;

  try {
    [rows] = await poolPromise.execute(`SHOW REPLICA STATUS`);
  } catch {
    // Fallback para MySQL < 8.0.22
    try {
      [rows] = await poolPromise.execute(`SHOW SLAVE STATUS`);
    } catch {
      return null; // No es una réplica o no tiene permisos
    }
  }

  if (!rows || rows.length === 0) {
    return null; // Este nodo no es réplica
  }

  const r = rows[0];

  return {
    is_replica: true,
    source_host: r.Source_Host ?? r.Master_Host,
    source_port: r.Source_Port ?? r.Master_Port,
    replica_io_running: r.Replica_IO_Running ?? r.Slave_IO_Running,
    replica_sql_running: r.Replica_SQL_Running ?? r.Slave_SQL_Running,
    seconds_behind_source: r.Seconds_Behind_Source ?? r.Seconds_Behind_Master,
    last_io_error: r.Last_IO_Error || null,
    last_sql_error: r.Last_SQL_Error || null,
    last_io_errno: r.Last_IO_Errno ?? r.Last_IO_Error_Number,
    last_sql_errno: r.Last_SQL_Errno ?? r.Last_SQL_Error_Number,
    relay_log_pos: r.Relay_Log_Pos,
    exec_source_log_pos: r.Exec_Source_Log_Pos ?? r.Exec_Master_Log_Pos,
    retrieved_gtid_set: r.Retrieved_Gtid_Set ?? null,
    executed_gtid_set: r.Executed_Gtid_Set ?? null,
    auto_position: r.Auto_Position ?? null,
    // Estado derivado para alertas
    is_healthy:
      (r.Replica_IO_Running ?? r.Slave_IO_Running) === "Yes" &&
      (r.Replica_SQL_Running ?? r.Slave_SQL_Running) === "Yes" &&
      (r.Seconds_Behind_Source ?? r.Seconds_Behind_Master ?? 0) < 30
  };
};

/**
 * Información del nodo como master/source.
 * Útil si este servidor tiene réplicas conectadas.
 */
const getSourceStatus = async () => {
  let rows;

  try {
    [rows] = await poolPromise.execute(`SHOW MASTER STATUS`);
  } catch {
    return null;
  }

  if (!rows || rows.length === 0) return null;

  const s = rows[0];
  return {
    is_source: true,
    file: s.File,
    position: s.Position,
    binlog_do_db: s.Binlog_Do_DB || null,
    binlog_ignore_db: s.Binlog_Ignore_DB || null,
    executed_gtid_set: s.Executed_Gtid_Set ?? null
  };
};

/**
 * Lista de réplicas conectadas a este nodo source.
 */
const getConnectedReplicas = async () => {
  try {
    const [rows] = await poolPromise.execute(`SHOW REPLICAS`);
    return rows;
  } catch {
    try {
      const [rows] = await poolPromise.execute(`SHOW SLAVE HOSTS`);
      return rows;
    } catch {
      return [];
    }
  }
};

export default {
  getReplicaStatus,
  getSourceStatus,
  getConnectedReplicas
};
