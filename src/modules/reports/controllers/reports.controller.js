import reportsService from "../services/reports.service.js";

const VALID_REPORTS = new Set(["general", "usuarios", "libros", "prestamos", "ventas", "eventos"]);
const VALID_STATUS = new Set(["", "activo", "completado", "pendiente", "cancelado"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const getSnapshot = async (req, res) => {
  try {
    const filters = {
      fecha_inicio: String(req.query.fecha_inicio || "").trim(),
      fecha_fin: String(req.query.fecha_fin || "").trim(),
      tipo_reporte: String(req.query.tipo_reporte || "general").trim().toLowerCase(),
      estado: String(req.query.estado || "").trim().toLowerCase(),
    };

    if ((filters.fecha_inicio && !ISO_DATE.test(filters.fecha_inicio)) || (filters.fecha_fin && !ISO_DATE.test(filters.fecha_fin))) {
      return res.status(400).json({ message: "El rango de fechas no tiene un formato válido." });
    }
    if (filters.fecha_inicio && filters.fecha_fin && filters.fecha_inicio > filters.fecha_fin) {
      return res.status(400).json({ message: "La fecha inicial no puede ser posterior a la fecha final." });
    }
    if (!VALID_REPORTS.has(filters.tipo_reporte) || !VALID_STATUS.has(filters.estado)) {
      return res.status(400).json({ message: "Los filtros indicados no son válidos." });
    }

    return res.json(await reportsService.getSnapshot(filters));
  } catch (error) {
    console.error("[Reports] Error obteniendo dashboard:", error);
    return res.status(500).json({ message: "No fue posible generar el reporte solicitado." });
  }
};

export default { getSnapshot };
