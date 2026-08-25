import { generateTimeSlots } from "@/lib/time-slots";

export function TimeSlotSelect({
  id,
  name,
  value,
  onChange,
  required,
  slots,
  loading,
  noDateSelected,
  emptyMessage = "כל השעות תפוסות ביום זה",
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Pass a pre-filtered list (e.g. from getAvailableStartTimesAction) to
   * only offer slots that won't conflict. Omit to fall back to every slot
   * on the standard grid, unfiltered. */
  slots?: string[];
  /** Shows a disabled placeholder while an async availability fetch is in flight. */
  loading?: boolean;
  /** True before a date has been picked yet - takes priority over `slots`,
   * so an empty array isn't mistaken for "fully booked". */
  noDateSelected?: boolean;
  /** Overrides the message shown (in the select, and as a bold red banner
   * below it) when a date is picked but every slot on it is taken. */
  emptyMessage?: string;
}) {
  const availableSlots = slots ?? generateTimeSlots();
  const isFullyBooked = !noDateSelected && !loading && slots !== undefined && availableSlots.length === 0;

  return (
    <div>
      <select
        id={id}
        name={name}
        value={value}
        required={required}
        disabled={loading || noDateSelected || isFullyBooked}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <option value="">בודק שעות פנויות...</option>
        ) : noDateSelected ? (
          <option value="">יש לבחור תאריך קודם</option>
        ) : isFullyBooked ? (
          <option value="">{emptyMessage}</option>
        ) : (
          <>
            <option value="">בחר/י שעה</option>
            {availableSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </>
        )}
      </select>
      {isFullyBooked && <p className="mt-1 text-sm font-bold text-status-destructive">{emptyMessage}</p>}
    </div>
  );
}
