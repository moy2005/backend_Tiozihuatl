import { poolPromise } from "../../../config/db.config.js";

const getIndexes = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT table_name, index_name, column_name
    FROM information_schema.statistics
    WHERE table_schema = ?
  `, [process.env.DB_NAME]);

  return rows;
};

const getTablesWithoutPK = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT table_name
    FROM information_schema.tables t
    WHERE table_schema = ?
    AND table_name NOT IN (
      SELECT table_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'PRIMARY KEY'
    )
  `, [process.env.DB_NAME]);

  return rows;
};

export default {
  getIndexes,
  getTablesWithoutPK
};
