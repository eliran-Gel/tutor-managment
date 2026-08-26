import { TIME_SLOT_MINUTES } from "@/lib/lessons";

/** "07:00".."22:45" in 15-minute steps (by default) - covers any realistic
 * lesson hour. Still used as-is for the tutor's own manual lesson creation
 * and for blocking/working-hours boundaries, which keep the finer grid. */
export function generateTimeSlots(startHour = 7, endHour = 23, stepMinutes = TIME_SLOT_MINUTES) {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

export function isValidTimeSlot(time: string) {
  const [, minuteStr] = time.split(":");
  const minute = Number(minuteStr);
  return minute % TIME_SLOT_MINUTES === 0;
}

/** Students may only request/reschedule lessons on the hour - the tutor's
 * own manual creation keeps the finer 15-minute grid (isValidTimeSlot). */
export function isValidHourSlot(time: string) {
  const [, minuteStr] = time.split(":");
  return Number(minuteStr) === 0;
}
