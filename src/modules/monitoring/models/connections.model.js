import { poolPromise } from "../../../config/db.config.js";

const getConnectionStats = async () => {
  const [max] = await poolPromise.execute(`SHOW VARIABLES LIKE 'max_connections'`);
  const [threads] = await poolPromise.execute(`SHOW STATUS LIKE 'Threads_connected'`);
  const [running] = await poolPromise.execute(`SHOW STATUS LIKE 'Threads_running'`);

  const maxConn = parseInt(max[0].Value);
  const used = parseInt(threads[0].Value);

  return {
    max_connections: maxConn,
    used_connections: used,
    usage_percent: ((used / maxConn) * 100).toFixed(2),
    threads_running: parseInt(running[0].Value)
  };
};

const getProcessList = async () => {
  const [rows] = await poolPromise.execute(`SHOW FULL PROCESSLIST`);
  return rows;
};

export default {
  getConnectionStats,
  getProcessList
};
