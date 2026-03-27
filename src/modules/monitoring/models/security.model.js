import { poolPromise } from "../../../config/db.config.js";

const getUsers = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT user, host FROM mysql.user
  `);
  return rows;
};

export default {
  getUsers
};
