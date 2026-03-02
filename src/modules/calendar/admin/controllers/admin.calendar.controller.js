import * as Service from "../services/admin.calendar.service.js";

export const createCalendar = async (req, res) => {
  try {
    const id = await Service.createCalendarService(req.body);
    res.json({ message: "Calendario creado", id });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  const data = await Service.listCalendarsService();
  res.json(data);
};

export const toggleStatus = async (req, res) => {
  const { activo } = req.body;
  await Service.toggleStatusService(req.params.id, activo);
  res.json({ message: "Estado actualizado" });
};
