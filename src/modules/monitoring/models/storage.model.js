import { poolPromise } from "../../../config/db.config.js";

const getTablesSize = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT
      table_name,
      ROUND((data_length + index_length)/1024/1024,2) AS total_mb,
      table_rows
    FROM information_schema.tables
    WHERE table_schema = ?
    ORDER BY total_mb DESC
  `, [process.env.DB_NAME]);

  return rows;
};

const getFragmentation = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT
      table_name,
      ROUND(data_free / (data_length + index_length) * 100,2) AS fragmentation
    FROM information_schema.tables
    WHERE table_schema = ?
  `, [process.env.DB_NAME]);

  return rows;
};

export default {
  getTablesSize,
  getFragmentation
};
