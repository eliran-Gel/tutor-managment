import { TIME_SLOT_MINUTES } from "@/lib/lessons";

/** "07:00".."22:45" in 15-minute steps - covers any realistic lesson hour. */
export function generateTimeSlots(startHour = 7, endHour = 23) {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += TIME_SLOT_MINUTES) {
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
