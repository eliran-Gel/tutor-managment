import { formatAppTime } from "@/lib/dates/timezone";

/** Time-of-day greeting in the tutor's local timezone - this runs
 * server-side, where the process clock is UTC, so the hour must come from
 * formatAppTime (Asia/Jerusalem) rather than a raw new Date().getHours(),
 * or the greeting would be hours off from the tutor's actual local time. */
export function getHebrewGreeting(now = new Date()) {
  const hour = Number(formatAppTime(now, "H"));
  if (hour >= 5 && hour < 12) return "בוקר טוב";
  if (hour >= 12 && hour < 15) return "צהריים טובים";
  if (hour >= 15 && hour < 18) return "אחר צהריים טובים";
  if (hour >= 18 && hour < 22) return "ערב טוב";
  return "לילה טוב";
}
