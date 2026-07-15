"use server";

import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/queries/auth-users";

export type AdvocateOption = {
  id: string;
  full_name: string;
  email: string;
};

/** Employees with employee_type = advocate, for onboarding dropdown. */
export async function listAdvocateEmployees(): Promise<AdvocateOption[]> {
  await requireUserWithRole(["admin", "employee"]);
  const admin = createAdminClient();

  const [{ data: profiles, error }, authUsers] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name")
      .eq("role", "employee")
      .eq("employee_type", "advocate")
      .order("full_name", { ascending: true }),
    listAllAuthUsers(),
  ]);

  if (error) {
    console.error("[advocates] listAdvocateEmployees failed", error.message);
    throw new Error("Unable to load advocates");
  }
  if (!profiles?.length) return [];

  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));

  return profiles
    .filter((p) => p.full_name)
    .map((p) => ({
      id: p.id as string,
      full_name: p.full_name as string,
      email: emailById.get(p.id as string) ?? "",
    }))
    .filter((p) => p.email);
}
