import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/tutor", "/portal"];

/**
 * Keeps the Supabase auth session cookie fresh, and does coarse role-based
 * routing: unauthenticated visitors to a protected area go to /login,
 * tutors are kept out of /portal, and everyone else is kept out of /tutor.
 * This is UX routing only — Row Level Security (see the profiles migration)
 * is the actual authorization boundary, not this middleware.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase project not configured yet (see .env.local.example) — skip
  // session handling instead of crashing every route.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user) {
    if (isProtected) {
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  if (isProtected || pathname === "/login") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const homePath = profile?.role === "tutor" ? "/tutor/dashboard" : "/portal/dashboard";

    if (pathname === "/login") {
      return NextResponse.redirect(new URL(homePath, request.url));
    }
    if (profile?.role === "tutor" && pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL(homePath, request.url));
    }
    if (profile?.role !== "tutor" && pathname.startsWith("/tutor")) {
      return NextResponse.redirect(new URL(homePath, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
