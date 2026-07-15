import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/database";

export type UserWithRole = {
  id: string;
  email: string;
  profile: Profile;
  role: UserRole;
};

export async function getUserWithRole(): Promise<UserWithRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Bound .eq — never interpolate email/id into SQL strings.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, employee_type, employee_code, address, mobile, created_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  const role = profile.role as UserRole;
  if (role !== "admin" && role !== "employee") return null;

  return {
    id: user.id,
    email: user.email ?? "",
    profile: profile as Profile,
    role,
  };
}

export function dashboardPathForRole(role: UserRole): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "employee") return "/employee/dashboard";
  return "/";
}

export async function requireUserWithRole(allowedRoles?: UserRole[]) {
  const current = await getUserWithRole();
  if (!current) {
    redirect("/");
  }
  if (allowedRoles && !allowedRoles.includes(current.role)) {
    redirect(dashboardPathForRole(current.role));
  }
  return current;
}
