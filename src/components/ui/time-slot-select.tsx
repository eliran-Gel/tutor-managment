import { generateTimeSlots } from "@/lib/time-slots";

export function TimeSlotSelect({
  id,
  name,
  value,
  onChange,
  required,
  slots,
  loading,
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
  /** Overrides the disabled placeholder shown when `slots` is an empty array. */
  emptyMessage?: string;
}) {
  const availableSlots = slots ?? generateTimeSlots();

  return (
    <select
      id={id}
      name={name}
      value={value}
      required={required}
      disabled={loading || (slots !== undefined && availableSlots.length === 0)}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-control border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <option value="">בודק שעות פנויות...</option>
      ) : slots !== undefined && availableSlots.length === 0 ? (
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
  );
}
