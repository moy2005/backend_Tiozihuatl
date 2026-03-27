import { poolPromise } from "../../../config/db.config.js";

const getGlobalStats = async () => {
  const variables = [
    "Queries",
    "Com_select",
    "Com_insert",
    "Com_update",
    "Com_delete",
    "Uptime",
    "Threads_connected",
    "Innodb_buffer_pool_read_requests",
    "Innodb_buffer_pool_reads"
  ];

  // 🔥 construir manualmente
  const inClause = variables.map(v => `'${v}'`).join(",");

  const [rows] = await poolPromise.query(`
    SHOW GLOBAL STATUS WHERE variable_name IN (${inClause})
  `);

  const result = {};
  rows.forEach(r => result[r.Variable_name] = Number(r.Value));

  // 🔥 Buffer Pool Hit Ratio (con protección)
  const hits = result.Innodb_buffer_pool_read_requests || 0;
  const reads = result.Innodb_buffer_pool_reads || 0;

  result.buffer_pool_hit_ratio =
    hits > 0 ? ((1 - reads / hits) * 100).toFixed(2) : 0;

  return result;
};

export default {
  getGlobalStats
};
