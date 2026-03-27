import { poolPromise } from "../../../config/db.config.js";

const getActiveQueries = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT id, user, db, command, time, state, LEFT(info, 300) AS query
    FROM information_schema.processlist
    WHERE command != 'Sleep'
    ORDER BY time DESC
  `);
  return rows;
};

const getSlowQueries = async () => {
  const [count] = await poolPromise.execute(`SHOW STATUS LIKE 'Slow_queries'`);
  const [time] = await poolPromise.execute(`SHOW VARIABLES LIKE 'long_query_time'`);

  return {
    slow_queries: parseInt(count[0].Value),
    long_query_time: time[0].Value
  };
};

export default {
  getActiveQueries,
  getSlowQueries
};
