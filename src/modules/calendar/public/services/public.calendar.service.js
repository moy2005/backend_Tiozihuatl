import * as CalendarModel from "../../models/calendar.model.js";

export const getActiveCalendar = async (tipo) => {
  return await CalendarModel.getActiveCalendarByTipo(tipo);
};

export const getDocenteCalendar = async (req, res) => {
  try {

    const calendar = await Service.getActiveCalendar("DOCENTE");

    if (!calendar) {
      return res.status(404).json({ 
        message: "No hay calendario docente activo" 
      });
    }

    res.json(calendar);

  } catch (error) {
    console.error("Error obtener calendario docente:", error);
    res.status(500).json({ 
      message: "Error interno del servidor" 
    });
  }
};