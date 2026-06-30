"use server";

import { notFound } from "next/navigation";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmployeeStats, Lead, Profile } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";

function countByStatus(leads: { status: string }[], status: string) {
  return leads.filter((l) => l.status === status).length;
}

export async function getEmployeesOverview(): Promise<EmployeeStats[]> {
  await requireUserWithRole(["admin"]);
  const admin = createAdminClient();

  const { data: profiles } = await admin.from("profiles").select("*");
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));

  const { data: authData } = await admin.auth.admin.listUsers();
  const authUsers = authData?.users ?? [];

  const stats: EmployeeStats[] = [];

  for (const user of authUsers) {
    const profile = profileById.get(user.id);
    if (profile?.role === "admin") continue;
    if (profile && profile.role !== "employee") continue;

    const { data: leads } = await admin
      .from("leads")
      .select("status")
      .eq("assigned_to", user.id);

    const { count: clientCount } = await admin
      .from("client_onboardings")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", user.id);

    const rows = leads ?? [];

    stats.push({
      id: user.id,
      full_name:
        profile?.full_name ??
        user.user_metadata?.full_name ??
        user.email?.split("@")[0] ??
        "Employee",
      role: "employee",
      created_at: profile?.created_at ?? user.created_at,
      email: user.email ?? undefined,
      assigned_count: countByStatus(rows, "assigned"),
      in_progress_count: countByStatus(rows, "in_progress"),
      converted_count: countByStatus(rows, "converted"),
      total_leads: rows.length,
      total_clients: clientCount ?? 0,
    });
  }

  return stats.sort((a, b) =>
    (a.full_name ?? "").localeCompare(b.full_name ?? "", undefined, { sensitivity: "base" })
  );
}

export async function getEmployeeProfilesForAdmin(): Promise<(Profile & { email?: string })[]> {
  const overview = await getEmployeesOverview();
  return overview.map(({ id, full_name, role, created_at, email }) => ({
    id,
    full_name,
    role,
    created_at,
    email,
  }));
}

export type EmployeeDetail = EmployeeStats & {
  leads: Lead[];
  activeLeads: Lead[];
  lostLeads: Lead[];
  clients: ClientOnboarding[];
};

export async function getEmployeeDetail(employeeId: string): Promise<EmployeeDetail> {
  await requireUserWithRole(["admin"]);
  const admin = createAdminClient();

  const overview = await getEmployeesOverview();
  const employee = overview.find((e) => e.id === employeeId);
  if (!employee) notFound();

  const { data: leads } = await admin
    .from("leads")
    .select("*")
    .eq("assigned_to", employeeId)
    .order("assigned_at", { ascending: false });

  const allLeads = (leads ?? []) as Lead[];
  const activeLeads = allLeads.filter((l) => l.status !== "lost");
  const lostLeads = allLeads.filter((l) => l.status === "lost");

  const { data: clients } = await admin
    .from("client_onboardings")
    .select("*")
    .eq("submitted_by", employeeId)
    .order("created_at", { ascending: false });

  return {
    ...employee,
    leads: allLeads,
    activeLeads,
    lostLeads,
    clients: (clients ?? []) as ClientOnboarding[],
  };
}
