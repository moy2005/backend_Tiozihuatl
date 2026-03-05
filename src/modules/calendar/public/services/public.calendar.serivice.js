import * as CalendarModel from "../../models/calendar.model.js";

export const getActiveCalendarService = async () => {
  return await CalendarModel.getActiveCalendar();
};
