import { isSameDay, getDay, startOfDay } from "date-fns";
import { toAppTime } from "@/lib/dates/timezone";
import type { Tables } from "@/types/database";

export type AvailabilityBlock = Tables<"availability_blocks">;

/**
 * Returns the blocks (if any) that make `localDate` unavailable, expanding
 * weekly-recurring blocks forward from their original date. `localDate`
 * should be a plain calendar date (time-of-day ignored) in APP_TIME_ZONE.
 */
export function blocksForDate(blocks: AvailabilityBlock[], localDate: Date): AvailabilityBlock[] {
  const targetDay = startOfDay(localDate);

  return blocks.filter((block) => {
    const blockStartLocal = toAppTime(block.start_at);
    const blockStartDay = startOfDay(blockStartLocal);

    if (block.recurrence_rule === "weekly") {
      return targetDay >= blockStartDay && getDay(targetDay) === getDay(blockStartDay);
    }

    return isSameDay(targetDay, blockStartLocal);
  });
}
