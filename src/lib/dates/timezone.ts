import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

// All scheduling in this product happens in the tutor's local timezone -
// there is exactly one tutor, one business, one timezone.
export const APP_TIME_ZONE = "Asia/Jerusalem";

export function toAppTime(utcDate: Date | string) {
  return toZonedTime(utcDate, APP_TIME_ZONE);
}

export function fromAppTime(localDate: Date) {
  return fromZonedTime(localDate, APP_TIME_ZONE);
}

export function formatAppTime(utcDate: Date | string, formatStr: string) {
  return formatInTimeZone(utcDate, APP_TIME_ZONE, formatStr);
}
