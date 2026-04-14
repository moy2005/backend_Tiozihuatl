export const LIBRARY_TIME_ZONE = "America/Mexico_City";
export const LIBRARY_OPEN_HOUR = 10;
export const LIBRARY_CLOSE_HOUR = 16;
export const MAX_PENDING_LOANS = 3;
export const LOCAL_NOW_SQL = "DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)";

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: LIBRARY_TIME_ZONE,
  weekday: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIBRARY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const BUSINESS_WEEKDAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

const toPartsMap = (parts) => {
  const output = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      output[part.type] = part.value;
    }
  }

  return output;
};

export const getLibraryNowParts = (date = new Date()) => {
  const dateParts = toPartsMap(dateTimeFormatter.formatToParts(date));
  const weekday = weekdayFormatter.format(date);

  return {
    ...dateParts,
    weekday,
  };
};

export const getCurrentLoanDateTimes = (date = new Date()) => {
  const parts = getLibraryNowParts(date);
  const datePart = `${parts.year}-${parts.month}-${parts.day}`;

  return {
    fechaPrestamo: `${datePart} ${parts.hour}:${parts.minute}:${parts.second}`,
    fechaVencimiento: `${datePart} ${String(LIBRARY_CLOSE_HOUR).padStart(2, "0")}:00:00`,
  };
};

export const assertLoanWindowOpen = (date = new Date()) => {
  const parts = getLibraryNowParts(date);
  const hour = Number(parts.hour);

  if (!BUSINESS_WEEKDAYS.has(parts.weekday)) {
    throw new Error("Solo se permiten prestamos de lunes a viernes");
  }

  if (hour < LIBRARY_OPEN_HOUR || hour >= LIBRARY_CLOSE_HOUR) {
    throw new Error("Horario permitido de 10:00 a 16:00");
  }

  return parts;
};
