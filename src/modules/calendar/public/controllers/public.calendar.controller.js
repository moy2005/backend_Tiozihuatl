import * as Service from "../services/public.calendar.service.js";

// ===============================
// CALENDARIO DOCENTE (Protegido)
// ===============================
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

// ===============================
//  CALENDARIO PÚBLICO (ALUMNO)
// ===============================
export const getPublicCalendar = async (req, res) => {
  try {

    const { tipo } = req.params;

    //  Validar tipo permitido
    const tiposPermitidos = ["ALUMNO"];

    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({
        message: "Tipo de calendario inválido"
      });
    }

    const calendar = await Service.getActiveCalendar(tipo);

    if (!calendar) {
      return res.status(404).json({
        message: "No hay calendario activo"
      });
    }

    res.json(calendar);

  } catch (error) {
    console.error("Error obtener calendario público:", error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};