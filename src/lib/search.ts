/** Reads the ?q= search text from a page's searchParams: trimmed and capped,
 * or "" when there is none. */
export function parseSearchQuery(q: string | string[] | undefined): string {
  const raw = Array.isArray(q) ? q[0] : q;
  return (raw ?? "").trim().slice(0, 60);
}

/** Case-insensitive "contains" pattern for PostgREST's ilike, with the
 * characters that act as wildcards in LIKE escaped so a search for "50%"
 * or "a_b" matches literally. */
export function containsPattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}
