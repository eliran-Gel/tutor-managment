import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// The only endpoint in this app meant to be called from a *different*
// origin (the marketing site, a separate static site with no backend of
// its own) by a visitor with no account and no session at all - so unlike
// every other mutation here, there is no RLS policy backing this, only
// this route's own validation before it writes with the service-role key.
// See the marketing_leads migration for why a lesson-request-shaped table
// wouldn't fit (no profile to attach the row to).
const ALLOWED_ORIGIN = "https://elirangelberg.com";

const leadSchema = z.object({
  full_name: z.string().trim().min(2, "יש להזין שם").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{8,9}$/, "מספר טלפון לא תקין"),
  grade: z.string().trim().max(50).optional().nullable(),
  message: z.string().trim().max(500).optional().nullable(),
  // Honeypot: a real visitor never sees or fills this field (hidden via
  // CSS on the form); a bot filling every field on the page will.
  website: z.string().max(0).optional().or(z.literal("")),
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400, headers });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" },
      { status: 400, headers },
    );
  }

  // Honeypot tripped - pretend success so the bot doesn't learn anything
  // from the response, but never touch the database.
  if (parsed.data.website) {
    return NextResponse.json({ success: true }, { headers });
  }

  const supabase = createAdminClient();
  const { error: insertErr } = await supabase.from("marketing_leads").insert({
    full_name: parsed.data.full_name,
    phone: parsed.data.phone,
    grade: parsed.data.grade || null,
    message: parsed.data.message || null,
  });
  if (insertErr) {
    return NextResponse.json({ error: "שגיאה בשמירת הפנייה, נסו שוב" }, { status: 500, headers });
  }

  // Best-effort: surface it as a real notification (bell + push, via the
  // same trigger every other notification already goes through) - if this
  // part fails the lead is still safely saved above, so it's not fatal.
  const { data: tutor } = await supabase.from("profiles").select("id").eq("role", "tutor").limit(1).maybeSingle();
  if (tutor) {
    await supabase.from("notifications").insert({
      recipient_profile_id: tutor.id,
      type: "marketing_lead",
      title: "פנייה חדשה מהאתר",
      body: `${parsed.data.full_name} · ${parsed.data.phone}${parsed.data.grade ? ` · ${parsed.data.grade}` : ""}`,
      link_path: "/tutor/requests",
    });
  }

  return NextResponse.json({ success: true }, { headers });
}
