/** Formats a plain "YYYY-MM-DD" date column value as "DD/MM/YYYY" - no
 * timezone conversion needed since a `date` column has no time-of-day. */
export function formatIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
