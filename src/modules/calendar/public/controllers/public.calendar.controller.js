import * as Service from "../services/public.calendar.serivice.js";

export const getActiveCalendar = async (req, res) => {
  const data = await Service.getActiveCalendarService();
  res.json(data);
};
