const HEBREW_WEEKDAYS_FULL = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת"];

// Gregorian month names in Hebrew transliteration - this app schedules by
// the Gregorian calendar throughout, not the Hebrew calendar, so these are
// the right set (not ניסן/אייר/... etc).
const HEBREW_MONTHS_FULL = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

/** Formats a plain "YYYY-MM-DD" date column value as "DD/MM/YYYY" - no
 * timezone conversion needed since a `date` column has no time-of-day. */
export function formatIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Same date, spelled out in Hebrew (e.g. "13 בספטמבר 2026") instead of
 * digits - used wherever a picked/relevant date is the whole point of what's
 * on screen, not just one field among many in a dense table row. */
export function formatIsoDateLong(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ב${HEBREW_MONTHS_FULL[month - 1]} ${year}`;
}

/** Same as formatIsoDateLong, but prefixed with the Hebrew weekday name
 * (e.g. "יום שלישי, 13 בספטמבר 2026") - a bare date forces the reader to
 * work out the weekday themselves, which matters when deciding whether a
 * slot is free. */
export function formatIsoDateWithWeekday(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = HEBREW_WEEKDAYS_FULL[new Date(year, month - 1, day).getDay()];
  return `${weekday}, ${formatIsoDateLong(isoDate)}`;
}

export { HEBREW_WEEKDAYS_FULL, HEBREW_MONTHS_FULL };
