import * as Model from "../../models/calendar.model.js";

export const createCalendarService = async (data) => {
  return await Model.createCalendar(data);
};

export const updateCalendarService = async (id, data) => {
  return await Model.updateCalendar(id, data);
};

export const deleteCalendarService = async (id) => {
  return await Model.deleteCalendar(id);
};

export const listCalendarsService = async () => {
  return await Model.getAllCalendars();
};

export const toggleStatusService = async (id, activo) => {
  return await Model.toggleCalendarStatus(id, activo);
};
