export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
};

function formatIcsUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** RFC 5545 requires folding lines longer than 75 octets (not characters -
 * Hebrew text is multi-byte in UTF-8), with continuation lines prefixed by
 * a single space. */
function foldLine(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines reserve 1 octet for the leading space
  }
  return parts.join("\r\n ");
}

function buildLine(name: string, value: string) {
  return foldLine(`${name}:${value}`);
}

export function buildIcsFeed(calendarName: string, events: IcsEvent[]) {
  const now = formatIcsUtc(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tutor Management//Lessons//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    buildLine("X-WR-CALNAME", escapeText(calendarName)),
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      buildLine("UID", event.uid),
      buildLine("DTSTAMP", now),
      buildLine("DTSTART", formatIcsUtc(event.start)),
      buildLine("DTEND", formatIcsUtc(event.end)),
      buildLine("SUMMARY", escapeText(event.summary)),
    );
    if (event.description) lines.push(buildLine("DESCRIPTION", escapeText(event.description)));
    if (event.location) lines.push(buildLine("LOCATION", escapeText(event.location)));
    lines.push("STATUS:CONFIRMED", "END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
