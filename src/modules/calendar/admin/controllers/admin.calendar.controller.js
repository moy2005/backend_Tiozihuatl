import * as Service from "../services/admin.calendar.service.js";

export const createCalendar = async (req, res) => {
  try {

    const { titulo, titulo_seccion, archivo_url, tipo_calendario, tipo_archivo } = req.body;

    if (!titulo || !archivo_url || !tipo_calendario || !tipo_archivo) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const id = await Service.createCalendarService({
      titulo,
      titulo_seccion: titulo_seccion || null,
      archivo_url,
      tipo_calendario,
      tipo_archivo
    });

    res.status(201).json({ message: "Calendario creado", id });

  } catch (error) {
    console.error("Error al crear calendario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateCalendar = async (req, res) => {
  await Service.updateCalendarService(req.params.id, req.body);
  res.json({ message: "Calendario actualizado" });
};

export const deleteCalendar = async (req, res) => {
  await Service.deleteCalendarService(req.params.id);
  res.json({ message: "Calendario eliminado" });
};

export const getCalendars = async (req, res) => {
  try {

    const { search, tipo_calendario, activo } = req.query;

    const data = await Service.listCalendarsService({
      search,
      tipo_calendario,
      activo
    });

    res.json(data);

  } catch (error) {

    console.error("❌ Error al listar calendarios:", error);

    res.status(500).json({
      message: "Error interno del servidor"
    });

  }
};

export const toggleStatus = async (req, res) => {
  const { activo } = req.body;
  await Service.toggleStatusService(req.params.id, activo);
  res.json({ message: "Estado actualizado" });
};

export const getPublicCalendar = async (req, res) => {
  try {
    const { tipo } = req.params;

    const pool = await poolPromise;

    const [rows] = await pool.query(
      "SELECT * FROM calendarios WHERE tipo_calendario = ? AND activo = 1",
      [tipo]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "No hay calendario activo" });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("❌ Error en getPublicCalendar:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
