import type { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// A parent can have more than one linked child (parent_students is many-
// to-many) - every portal page needs to agree on exactly one of them at a
// time, or a multi-child household sees data blended across kids with no
// indication of whose is whose. A student has exactly one "child" (their
// own row), so the same shape covers both roles with no special-casing at
// the call site.
export type PortalChild = {
  id: string;
  display_name: string;
  grade: number | null;
  grade_year: number | null;
  school_name: string | null;
};

export type SelectedChild = {
  current: PortalChild | null;
  children: PortalChild[];
  // Only true for a parent linked to more than one child - a student, or
  // a parent with exactly one child, has nothing to switch between, so no
  // selector UI should render for them at all.
  needsSelector: boolean;
};

const CHILD_COLUMNS = "id, display_name, grade, grade_year, school_name";

/**
 * A student login whose students row was deleted (the tutor removed the
 * student but not the account) would otherwise be stuck forever on "your
 * account isn't linked" and unable to book. Gives it a fresh row, the same
 * one signup would have created. Safe if the layout and the page both run
 * this in the same request: students.profile_id is unique and the second
 * insert is ignored.
 */
async function recreateOwnStudent(profileId: string): Promise<PortalChild | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", profileId)
    .single();
  if (!profile || profile.role !== "student") return null;

  await admin.from("students").upsert(
    {
      profile_id: profileId,
      is_guest: false,
      claimed_at: new Date().toISOString(),
      display_name: (profile.full_name ?? profile.email ?? "תלמיד/ה").slice(0, 40),
    },
    { onConflict: "profile_id", ignoreDuplicates: true },
  );

  const { data } = await admin.from("students").select(CHILD_COLUMNS).eq("profile_id", profileId).maybeSingle();
  return data;
}

export async function getSelectedChild(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { id: string; role: "tutor" | "parent" | "student" } | null,
  requestedChildId?: string,
): Promise<SelectedChild> {
  if (!profile) return { current: null, children: [], needsSelector: false };

  if (profile.role === "student") {
    const { data } = await supabase
      .from("students")
      .select(CHILD_COLUMNS)
      .eq("profile_id", profile.id)
      .maybeSingle();
    const own = data ?? (await recreateOwnStudent(profile.id));
    return { current: own, children: own ? [own] : [], needsSelector: false };
  }

  if (profile.role === "parent") {
    // Explicit, stable order (alphabetical by name) - both this call (from
    // the layout, deciding whether/what to show in the switcher) and each
    // page's own call (deciding which child's data to actually query) need
    // to agree on the same "first child" default with no ?child= param,
    // or the switcher's highlighted pill and the page's real data could
    // silently point at two different kids.
    const { data } = await supabase
      .from("parent_students")
      .select(`students (${CHILD_COLUMNS})`)
      .eq("parent_profile_id", profile.id)
      .order("display_name", { referencedTable: "students" });

    const children = (data ?? [])
      .map((row) => row.students)
      .filter((s): s is PortalChild => Boolean(s));
    const current = children.find((c) => c.id === requestedChildId) ?? children[0] ?? null;
    return { current, children, needsSelector: children.length > 1 };
  }

  return { current: null, children: [], needsSelector: false };
}
