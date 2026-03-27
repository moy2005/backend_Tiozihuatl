import { poolPromise } from "../../../config/db.config.js";

const getDatabaseStatus = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT
      table_schema AS db_name,
      COUNT(*) AS total_tables,
      SUM(table_rows) AS total_rows,
      ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_size_mb
    FROM information_schema.tables
    WHERE table_schema = ?
    GROUP BY table_schema
  `, [process.env.DB_NAME]);

  return rows[0] ?? null;
};

const getDatabaseEngines = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT engine, COUNT(*) AS total
    FROM information_schema.tables
    WHERE table_schema = ?
    GROUP BY engine
  `, [process.env.DB_NAME]);

  return rows;
};

export default {
  getDatabaseStatus,
  getDatabaseEngines
};
