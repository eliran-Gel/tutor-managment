const HEBREW_WEEKDAYS_FULL = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת"];

/** Formats a plain "YYYY-MM-DD" date column value as "DD/MM/YYYY" - no
 * timezone conversion needed since a `date` column has no time-of-day. */
export function formatIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Same as formatIsoDate, but prefixed with the Hebrew weekday name (e.g.
 * "יום שלישי, 01/09/2026") - a bare date forces the reader to work out the
 * weekday themselves, which matters when deciding whether a slot is free. */
export function formatIsoDateWithWeekday(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = HEBREW_WEEKDAYS_FULL[new Date(year, month - 1, day).getDay()];
  return `${weekday}, ${formatIsoDate(isoDate)}`;
}

export { HEBREW_WEEKDAYS_FULL };
