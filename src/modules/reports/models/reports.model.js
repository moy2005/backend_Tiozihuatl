import { poolPromise } from "../../../config/db.config.js";

const withDateRange = (column, filters, params) => {
  const conditions = [];
  if (filters.fecha_inicio) {
    conditions.push(`DATE(${column}) >= ?`);
    params.push(filters.fecha_inicio);
  }
  if (filters.fecha_fin) {
    conditions.push(`DATE(${column}) <= ?`);
    params.push(filters.fecha_fin);
  }
  return conditions;
};

const statusFor = (domain, status) => {
  const map = {
    loans: { activo: "Activo", completado: "Devuelto", pendiente: "Vencido", cancelado: "Cancelado" },
    sales: { activo: "pendiente", completado: "pagado", pendiente: "pendiente", cancelado: "cancelado" },
    events: { activo: "Publicado", completado: "Finalizado", pendiente: "Borrador", cancelado: "Cancelado" },
    users: { activo: "Activo", completado: "Activo", pendiente: "Pendiente", cancelado: "Inactivo" },
  };
  return map[domain]?.[status] || null;
};

const buildWhere = (column, filters, domain, extra = []) => {
  const params = [];
  const conditions = [...extra, ...withDateRange(column, filters, params)];
  const mappedStatus = statusFor(domain, filters.estado);
  if (mappedStatus) {
    const stateColumn = domain === "sales" ? "c.estado" : domain === "events" ? "e.estado" : domain === "users" ? "u.estado" : "p.estado";
    conditions.push(`${stateColumn} = ?`);
    params.push(mappedStatus);
  }
  return { sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
};

const queryRows = async (sql, params = []) => {
  const [rows] = await poolPromise.query(sql, params);
  return rows;
};

const getKpis = async (filters, previousFilters) => {
  const userWhere = buildWhere("u.fecha_registro", filters, "users");
  const previousUserWhere = buildWhere("u.fecha_registro", previousFilters, "users");
  const loanWhere = buildWhere("p.fecha_prestamo", filters, "loans");
  const previousLoanWhere = buildWhere("p.fecha_prestamo", previousFilters, "loans");
  const salesWhere = buildWhere("c.created_at", filters, "sales", ["c.estado = 'pagado'"]);
  const previousSalesWhere = buildWhere("c.created_at", previousFilters, "sales", ["c.estado = 'pagado'"]);
  const eventWhere = buildWhere("e.fecha_inicio", filters, "events");
  const previousEventWhere = buildWhere("e.fecha_inicio", previousFilters, "events");

  const [
    usersTotal,
    usersPeriod,
    usersPrevious,
    inventory,
    activeLoans,
    loansPeriod,
    loansPrevious,
    salesPeriod,
    salesPrevious,
    eventsPeriod,
    eventsPrevious,
  ] = await Promise.all([
    queryRows("SELECT COUNT(*) AS total FROM usuarios"),
    queryRows(`SELECT COUNT(*) AS total FROM usuarios u ${userWhere.sql}`, userWhere.params),
    queryRows(`SELECT COUNT(*) AS total FROM usuarios u ${previousUserWhere.sql}`, previousUserWhere.params),
    queryRows(`SELECT COALESCE(SUM(disponibles), 0) AS disponibles, COALESCE(SUM(total), 0) AS total FROM libro_formatos WHERE tipo = 'FISICO'`),
    queryRows("SELECT COUNT(*) AS total FROM prestamos WHERE estado = 'Activo'"),
    queryRows(`SELECT COUNT(*) AS total FROM prestamos p ${loanWhere.sql}`, loanWhere.params),
    queryRows(`SELECT COUNT(*) AS total FROM prestamos p ${previousLoanWhere.sql}`, previousLoanWhere.params),
    queryRows(`SELECT COUNT(*) AS total, COALESCE(SUM(c.total), 0) AS ingresos FROM compras c ${salesWhere.sql}`, salesWhere.params),
    queryRows(`SELECT COUNT(*) AS total FROM compras c ${previousSalesWhere.sql}`, previousSalesWhere.params),
    queryRows(`SELECT COUNT(*) AS total FROM eventos e ${eventWhere.sql}`, eventWhere.params),
    queryRows(`SELECT COUNT(*) AS total FROM eventos e ${previousEventWhere.sql}`, previousEventWhere.params),
  ]);

  return {
    users: { value: Number(usersTotal[0]?.total || 0), period: Number(usersPeriod[0]?.total || 0), previous: Number(usersPrevious[0]?.total || 0) },
    books: { value: Number(inventory[0]?.disponibles || 0), total: Number(inventory[0]?.total || 0) },
    loans: { value: Number(activeLoans[0]?.total || 0), period: Number(loansPeriod[0]?.total || 0), previous: Number(loansPrevious[0]?.total || 0) },
    sales: { value: Number(salesPeriod[0]?.total || 0), previous: Number(salesPrevious[0]?.total || 0), revenue: Number(salesPeriod[0]?.ingresos || 0) },
    events: { value: Number(eventsPeriod[0]?.total || 0), previous: Number(eventsPrevious[0]?.total || 0) },
  };
};

const getLoanTrend = async (filters) => {
  const where = buildWhere("p.fecha_prestamo", filters, "loans");
  return queryRows(`
    SELECT DATE_FORMAT(p.fecha_prestamo, '%Y-%m-%d') AS fecha,
           COUNT(*) AS prestamos,
           SUM(p.estado = 'Devuelto') AS devoluciones
    FROM prestamos p
    ${where.sql}
    GROUP BY fecha
    ORDER BY fecha
  `, where.params);
};

const getTopBooks = async (filters) => {
  const where = buildWhere("p.fecha_prestamo", filters, "loans");
  return queryRows(`
    SELECT l.id, l.titulo, COUNT(p.id_prestamo) AS solicitudes,
           SUM(p.estado = 'Devuelto') AS devoluciones,
           MAX(p.fecha_prestamo) AS ultima_solicitud,
           COALESCE(MAX(lf.disponibles), 0) AS disponibles
    FROM prestamos p
    INNER JOIN libros l ON l.id = p.libro_id
    LEFT JOIN libro_formatos lf ON lf.libro_id = l.id AND lf.tipo = 'FISICO'
    ${where.sql}
    GROUP BY l.id, l.titulo
    ORDER BY solicitudes DESC, ultima_solicitud DESC
    LIMIT 10
  `, where.params);
};

const getUsersByRole = async (filters) => {
  const where = buildWhere("u.fecha_registro", filters, "users");
  return queryRows(`
    SELECT r.nombre_rol AS rol, COUNT(*) AS total
    FROM usuarios u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    ${where.sql}
    GROUP BY r.id_rol, r.nombre_rol
    ORDER BY total DESC
  `, where.params);
};

const getMagazineSales = async (filters) => {
  const where = buildWhere("c.created_at", filters, "sales", ["c.estado = 'pagado'"]);
  return queryRows(`
    SELECT r.id_revista, r.titulo, COUNT(dc.id_detalle) AS unidades,
           COALESCE(SUM(dc.precio_final), 0) AS ingresos
    FROM compras c
    INNER JOIN detalle_compra dc ON dc.id_compra = c.id_compra
    INNER JOIN revistas r ON r.id_revista = dc.id_revista
    ${where.sql}
    GROUP BY r.id_revista, r.titulo
    ORDER BY unidades DESC, ingresos DESC
    LIMIT 10
  `, where.params);
};

const getActivitySeries = async (filters) => {
  const definitions = [
    ["usuarios", "u", "u.fecha_registro", "users", "usuarios"],
    ["prestamos", "p", "p.fecha_prestamo", "loans", "prestamos"],
    ["compras", "c", "c.created_at", "sales", "ventas"],
    ["eventos", "e", "e.fecha_inicio", "events", "eventos"],
  ];

  const results = await Promise.all(definitions.map(async ([table, alias, column, domain, key]) => {
    const where = buildWhere(column, filters, domain);
    const rows = await queryRows(`
      SELECT DATE_FORMAT(${column}, '%Y-%m-%d') AS fecha, COUNT(*) AS total
      FROM ${table} ${alias}
      ${where.sql}
      GROUP BY fecha
      ORDER BY fecha
    `, where.params);
    return { key, rows };
  }));

  return results;
};

const getLatestLoans = async (filters) => {
  const where = buildWhere("p.fecha_prestamo", filters, "loans");
  return queryRows(`
    SELECT p.id_prestamo, l.titulo,
           TRIM(CONCAT_WS(' ', u.nombre, u.a_paterno, u.a_materno)) AS usuario,
           u.matricula, p.estado,
           DATE_FORMAT(p.fecha_prestamo, '%Y-%m-%d %H:%i:%s') AS fecha_prestamo,
           DATE_FORMAT(p.fecha_vencimiento, '%Y-%m-%d %H:%i:%s') AS fecha_vencimiento,
           DATE_FORMAT(p.fecha_devolucion, '%Y-%m-%d %H:%i:%s') AS fecha_devolucion
    FROM prestamos p
    INNER JOIN usuarios u ON u.id_usuario = p.id_usuario
    INNER JOIN libros l ON l.id = p.libro_id
    ${where.sql}
    ORDER BY p.fecha_prestamo DESC, p.id_prestamo DESC
    LIMIT 50
  `, where.params);
};

const getLatestSales = async (filters) => {
  const where = buildWhere("c.created_at", filters, "sales");
  return queryRows(`
    SELECT c.id_compra,
           TRIM(CONCAT_WS(' ', u.nombre, u.a_paterno, u.a_materno)) AS usuario,
           u.correo, COALESCE(detalle.revistas, 'Sin detalle') AS revistas,
           c.total, c.estado,
           DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS fecha
    FROM compras c
    LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
    LEFT JOIN (
      SELECT dc.id_compra, GROUP_CONCAT(r.titulo ORDER BY r.titulo SEPARATOR ', ') AS revistas
      FROM detalle_compra dc
      LEFT JOIN revistas r ON r.id_revista = dc.id_revista
      GROUP BY dc.id_compra
    ) detalle ON detalle.id_compra = c.id_compra
    ${where.sql}
    ORDER BY c.created_at DESC, c.id_compra DESC
    LIMIT 50
  `, where.params);
};

const getRecentUsers = async (filters) => {
  const where = buildWhere("u.fecha_registro", filters, "users");
  return queryRows(`
    SELECT u.id_usuario, TRIM(CONCAT_WS(' ', u.nombre, u.a_paterno, u.a_materno)) AS usuario,
           r.nombre_rol AS rol, u.estado,
           DATE_FORMAT(u.fecha_registro, '%Y-%m-%d %H:%i:%s') AS fecha
    FROM usuarios u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    ${where.sql}
    ORDER BY u.fecha_registro DESC
    LIMIT 20
  `, where.params);
};

const getRecentEvents = async (filters) => {
  const where = buildWhere("e.fecha_inicio", filters, "events");
  return queryRows(`
    SELECT e.id_evento, e.titulo, e.tipo, e.estado,
           DATE_FORMAT(e.fecha_inicio, '%Y-%m-%d %H:%i:%s') AS fecha
    FROM eventos e
    ${where.sql}
    ORDER BY e.fecha_inicio DESC
    LIMIT 20
  `, where.params);
};

const getSnapshot = async (filters, previousFilters) => {
  const [kpis, loanTrend, topBooks, usersByRole, magazineSales, activitySeries, latestLoans, latestSales, recentUsers, recentEvents] = await Promise.all([
    getKpis(filters, previousFilters),
    getLoanTrend(filters),
    getTopBooks(filters),
    getUsersByRole(filters),
    getMagazineSales(filters),
    getActivitySeries(filters),
    getLatestLoans(filters),
    getLatestSales(filters),
    getRecentUsers(filters),
    getRecentEvents(filters),
  ]);

  return { kpis, loanTrend, topBooks, usersByRole, magazineSales, activitySeries, latestLoans, latestSales, recentUsers, recentEvents };
};

export default { getSnapshot };
