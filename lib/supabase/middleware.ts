import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/lib/types/database";
import {
  SUPABASE_SESSION_COOKIE_OPTIONS,
  toServerSessionCookieOptions,
} from "@/lib/supabase/session-cookies";
type ProfileAccess =
  | { kind: "ok"; role: UserRole }
  | { kind: "deactivated" }
  | { kind: "missing" };

async function getProfileAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<ProfileAccess> {
  const { data } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return { kind: "missing" };
  if (data.is_active === false) return { kind: "deactivated" };

  const role = data.role;
  if (role === "admin" || role === "employee") return { kind: "ok", role };
  return { kind: "missing" };
}

function redirectHome(request: NextRequest, query?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SUPABASE_SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, toServerSessionCookieOptions(options))
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname === "/" || pathname.startsWith("/login");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/employee") ||
    pathname.startsWith("/notices");

  if (!user && isProtectedRoute) {
    return redirectHome(request);
  }

  if (user) {
    const access = await getProfileAccess(supabase, user.id);

    if (access.kind === "deactivated") {
      await supabase.auth.signOut();
      return redirectHome(request, { account: "removed" });
    }

    // Auth user without usable profile → sign out (avoids / ↔ /employee loop).
    if (access.kind === "missing") {
      await supabase.auth.signOut();
      if (!isAuthRoute) {
        return redirectHome(request);
      }
      return supabaseResponse;
    }

    const role = access.role;
    const dashboard = role === "admin" ? "/admin/dashboard" : "/employee/dashboard";

    if (isAuthRoute || pathname.startsWith("/setup")) {
      const url = request.nextUrl.clone();
      url.pathname = dashboard;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = dashboard;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/employee/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/employee") && role === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
