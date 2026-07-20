import reportsModel from "../models/reports.model.js";

const percentageChange = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const previousRange = (filters) => {
  if (!filters.fecha_inicio || !filters.fecha_fin) return {};
  const start = new Date(`${filters.fecha_inicio}T00:00:00`);
  const end = new Date(`${filters.fecha_fin}T00:00:00`);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - duration + 1);
  const iso = (date) => date.toISOString().slice(0, 10);
  return { fecha_inicio: iso(previousStart), fecha_fin: iso(previousEnd), estado: filters.estado };
};

const normalizeNumbers = (rows, keys) => rows.map((row) => {
  const normalized = { ...row };
  keys.forEach((key) => { normalized[key] = Number(normalized[key] || 0); });
  return normalized;
});

const mergeActivitySeries = (series) => {
  const dates = new Map();
  series.forEach(({ key, rows }) => rows.forEach((row) => {
    const item = dates.get(row.fecha) || { fecha: row.fecha, usuarios: 0, prestamos: 0, ventas: 0, eventos: 0 };
    item[key] = Number(row.total || 0);
    dates.set(row.fecha, item);
  }));
  return [...dates.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
};

const dateDifferenceInDays = (start, end) => {
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const endTime = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((endTime - startTime) / 86400000));
};

const selectGranularity = (filters, series) => {
  let start = filters.fecha_inicio;
  let end = filters.fecha_fin;

  if (!start || !end) {
    const dates = series.map((row) => row.fecha).filter(Boolean).sort();
    start ||= dates[0] || "";
    end ||= dates.at(-1) || "";
  }

  if (!start || !end) return "day";
  const days = dateDifferenceInDays(start, end);
  if (days > 730) return "month";
  if (days > 120) return "week";
  return "day";
};

const periodStart = (dateValue, granularity) => {
  if (granularity === "month") return `${dateValue.slice(0, 7)}-01`;
  if (granularity !== "week") return dateValue;

  const date = new Date(`${dateValue}T00:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
};

const aggregateTimeSeries = (rows, numericKeys, granularity) => {
  if (granularity === "day") return rows;

  const periods = new Map();
  rows.forEach((row) => {
    const fecha = periodStart(row.fecha, granularity);
    const current = periods.get(fecha) || { fecha };
    numericKeys.forEach((key) => {
      current[key] = Number(current[key] || 0) + Number(row[key] || 0);
    });
    periods.set(fecha, current);
  });

  return [...periods.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
};

const buildRecentActivity = (data) => {
  const loans = data.latestLoans.map((item) => ({
    id: `prestamo-${item.id_prestamo}`, tipo: "Préstamo", descripcion: item.titulo,
    usuario: item.usuario, estado: item.estado, fecha: item.fecha_prestamo, monto: null,
  }));
  const sales = data.latestSales.map((item) => ({
    id: `venta-${item.id_compra}`, tipo: "Venta", descripcion: item.revistas,
    usuario: item.usuario || "Usuario no disponible", estado: item.estado, fecha: item.fecha, monto: Number(item.total || 0),
  }));
  const users = data.recentUsers.map((item) => ({
    id: `usuario-${item.id_usuario}`, tipo: "Usuario", descripcion: `Registro ${item.rol}`,
    usuario: item.usuario, estado: item.estado, fecha: item.fecha, monto: null,
  }));
  const events = data.recentEvents.map((item) => ({
    id: `evento-${item.id_evento}`, tipo: "Evento", descripcion: item.titulo,
    usuario: item.tipo, estado: item.estado, fecha: item.fecha, monto: null,
  }));
  return [...loans, ...sales, ...users, ...events]
    .filter((item) => item.fecha)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .slice(0, 50);
};

const getSnapshot = async (filters) => {
  const previousFilters = previousRange(filters);
  const data = await reportsModel.getSnapshot(filters, previousFilters);

  if (filters.fecha_inicio && filters.fecha_fin) {
    data.kpis.users.variation = percentageChange(data.kpis.users.period, data.kpis.users.previous);
    data.kpis.loans.variation = percentageChange(data.kpis.loans.period, data.kpis.loans.previous);
    data.kpis.sales.variation = percentageChange(data.kpis.sales.value, data.kpis.sales.previous);
    data.kpis.events.variation = percentageChange(data.kpis.events.value, data.kpis.events.previous);
  }

  const dailyLoanTrend = normalizeNumbers(data.loanTrend, ["prestamos", "devoluciones"]);
  const dailyInstitutionalActivity = mergeActivitySeries(data.activitySeries);
  const granularity = selectGranularity(filters, [
    ...dailyLoanTrend,
    ...dailyInstitutionalActivity,
  ]);

  return {
    meta: {
      generated_at: new Date().toISOString(),
      filters,
      previous_period: previousFilters,
      granularity,
    },
    kpis: data.kpis,
    charts: {
      loan_trend: aggregateTimeSeries(
        dailyLoanTrend,
        ["prestamos", "devoluciones"],
        granularity,
      ),
      top_books: normalizeNumbers(data.topBooks, ["solicitudes", "devoluciones", "disponibles"]),
      users_by_role: normalizeNumbers(data.usersByRole, ["total"]),
      magazine_sales: normalizeNumbers(data.magazineSales, ["unidades", "ingresos"]),
      institutional_activity: aggregateTimeSeries(
        dailyInstitutionalActivity,
        ["usuarios", "prestamos", "ventas", "eventos"],
        granularity,
      ),
    },
    tables: {
      latest_loans: data.latestLoans,
      top_books: normalizeNumbers(data.topBooks, ["solicitudes", "devoluciones", "disponibles"]),
      latest_sales: normalizeNumbers(data.latestSales, ["total"]),
      recent_activity: buildRecentActivity(data),
    },
  };
};

export default { getSnapshot };
