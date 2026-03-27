import database from "./database.model.js";
import connections from "./connections.model.js";
import queries from "./queries.model.js";
import performance from "./performance.model.js";
import alerts from "./alerts.model.js";

const getDashboard = async () => {
  const [
    db,
    conn,
    q,
    perf,
    alertList
  ] = await Promise.all([
    database.getDatabaseStatus(),
    connections.getConnectionStats(),
    queries.getSlowQueries(),
    performance.getGlobalStats(),
    alerts.getAlerts()
  ]);

  return {
    database: db,
    connections: conn,
    slow_queries: q,
    performance: perf,
    alerts: alertList
  };
};

export default {
  getDashboard
};
