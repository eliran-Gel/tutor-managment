export type RelativeMonthBucket = "this_month" | "last_month" | "2_months_ago" | "3_months_ago" | "older" | "future";

export const RELATIVE_MONTH_BUCKET_LABELS: Record<RelativeMonthBucket, string> = {
  future: "עתידי",
  this_month: "החודש",
  last_month: "חודש שעבר",
  "2_months_ago": "לפני חודשיים",
  "3_months_ago": "לפני 3 חודשים",
  older: "ישן יותר",
};

// Always computed against "now" at call time, so buckets like "last month"
// stay correct as real days pass - no stored/cached bucket assignment.
export function relativeMonthBucket(isoDate: string, now = new Date()): RelativeMonthBucket {
  const [y, m] = isoDate.split("-").map(Number);
  const monthsAgo = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);

  if (monthsAgo < 0) return "future";
  if (monthsAgo === 0) return "this_month";
  if (monthsAgo === 1) return "last_month";
  if (monthsAgo === 2) return "2_months_ago";
  if (monthsAgo === 3) return "3_months_ago";
  return "older";
}
