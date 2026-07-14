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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    profile: profile as Profile,
    role: profile.role as UserRole,
  };
}

export function dashboardPathForRole(role: UserRole): string {
  return role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
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
