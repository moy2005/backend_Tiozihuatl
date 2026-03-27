import { poolPromise } from "../../../config/db.config.js";

const getBackupHistory = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT * FROM backups_log ORDER BY fecha DESC
  `);
  return rows;
};

export default {
  getBackupHistory
};
