"use server";

import { notFound } from "next/navigation";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/queries/auth-users";
import { getEmployeeProfilesFromDb } from "@/lib/queries/profiles";
import type { EmployeeStats, Lead, Profile } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";

const EMPLOYEE_DETAIL_LIST_LIMIT = 100;



async function fetchAggregatedEmployeeStats(admin: ReturnType<typeof createAdminClient>) {
  const [{ data: leadRows }, { data: clientRows }] = await Promise.all([
    admin.rpc("get_employee_lead_stats"),
    admin.rpc("get_employee_client_counts"),
  ]);

  const leadStats = new Map<
    string,
    { assigned: number; in_progress: number; converted: number; total: number }
  >();

  type RpcLeadRow = { employee_id: string | null; status: string; count: string | number };
  for (const row of (leadRows ?? []) as RpcLeadRow[]) {
    const empId = row.employee_id;
    if (!empId) continue;

    const entry = leadStats.get(empId) ?? { assigned: 0, in_progress: 0, converted: 0, total: 0 };
    const count = Number(row.count) || 0;

    entry.total += count;
    if (row.status === "assigned") entry.assigned += count;
    if (row.status === "in_progress") entry.in_progress += count;
    if (row.status === "converted") entry.converted += count;

    leadStats.set(empId, entry);
  }

  const clientCounts = new Map<string, number>();
  type RpcClientRow = { employee_id: string | null; count: string | number };
  for (const row of (clientRows ?? []) as RpcClientRow[]) {
    if (row.employee_id) {
      clientCounts.set(row.employee_id, Number(row.count) || 0);
    }
  }

  return { leadStats, clientCounts };
}

async function buildEmployeeStatsList(): Promise<EmployeeStats[]> {
  await requireUserWithRole(["admin"]);
  const admin = createAdminClient();

  const [employeeProfiles, authUsers, { leadStats, clientCounts }] = await Promise.all([
    getEmployeeProfilesFromDb(),
    listAllAuthUsers(),
    fetchAggregatedEmployeeStats(admin),
  ]);

  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? undefined]));
  const authMetaById = new Map(authUsers.map((u) => [u.id, u]));

  const stats: EmployeeStats[] = employeeProfiles.map((profile) => {
    const authUser = authMetaById.get(profile.id);
    const counts = leadStats.get(profile.id);

    return {
      id: profile.id,
      full_name:
        profile.full_name ??
        authUser?.user_metadata?.full_name ??
        authUser?.email?.split("@")[0] ??
        "Employee",
      role: "employee",
      employee_type: (profile.employee_type as Profile["employee_type"]) ?? "general",
      created_at: profile.created_at ?? authUser?.created_at ?? new Date().toISOString(),
      email: emailById.get(profile.id),
      assigned_count: counts?.assigned ?? 0,
      in_progress_count: counts?.in_progress ?? 0,
      converted_count: counts?.converted ?? 0,
      total_leads: counts?.total ?? 0,
      total_clients: clientCounts.get(profile.id) ?? 0,
    };
  });

  return stats.sort((a, b) =>
    (a.full_name ?? "").localeCompare(b.full_name ?? "", undefined, { sensitivity: "base" })
  );
}

async function getEmployeeStatsForId(employeeId: string): Promise<EmployeeStats | null> {
  const admin = createAdminClient();

  const [{ data: profile }, authUsers, { leadStats, clientCounts }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, employee_type, created_at")
      .eq("id", employeeId)
      .maybeSingle(),
    listAllAuthUsers(),
    fetchAggregatedEmployeeStats(admin),
  ]);

  if (!profile || profile.role !== "employee") return null;

  const authUser = authUsers.find((u) => u.id === employeeId);
  const counts = leadStats.get(employeeId);

  return {
    id: profile.id,
    full_name:
      profile.full_name ??
      authUser?.user_metadata?.full_name ??
      authUser?.email?.split("@")[0] ??
      "Employee",
    role: "employee",
    employee_type: (profile.employee_type as Profile["employee_type"]) ?? "general",
    created_at: profile.created_at ?? authUser?.created_at ?? new Date().toISOString(),
    email: authUser?.email ?? undefined,
    assigned_count: counts?.assigned ?? 0,
    in_progress_count: counts?.in_progress ?? 0,
    converted_count: counts?.converted ?? 0,
    total_leads: counts?.total ?? 0,
    total_clients: clientCounts.get(employeeId) ?? 0,
  };
}

export async function getEmployeesOverview(): Promise<EmployeeStats[]> {
  return buildEmployeeStatsList();
}

export async function getEmployeeProfilesForAdmin(): Promise<(Profile & { email?: string })[]> {
  await requireUserWithRole(["admin"]);
  const [employeeProfiles, authUsers] = await Promise.all([
    getEmployeeProfilesFromDb(),
    listAllAuthUsers(),
  ]);

  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? undefined]));
  const authMetaById = new Map(authUsers.map((u) => [u.id, u]));

  return employeeProfiles.map((profile) => ({
    id: profile.id,
    full_name:
      profile.full_name ??
      authMetaById.get(profile.id)?.user_metadata?.full_name ??
      authMetaById.get(profile.id)?.email?.split("@")[0] ??
      "Employee",
    role: "employee" as const,
    employee_type: (profile.employee_type as Profile["employee_type"]) ?? "general",
    created_at: profile.created_at,
    email: emailById.get(profile.id),
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

  const employee = await getEmployeeStatsForId(employeeId);
  if (!employee) notFound();

  const [{ data: leads }, { data: clients }] = await Promise.all([
    admin
      .from("leads")
      .select("*")
      .eq("assigned_to", employeeId)
      .order("assigned_at", { ascending: false })
      .limit(EMPLOYEE_DETAIL_LIST_LIMIT),
    admin
      .from("client_onboardings")
      .select("*")
      .eq("submitted_by", employeeId)
      .order("created_at", { ascending: false })
      .limit(EMPLOYEE_DETAIL_LIST_LIMIT),
  ]);

  const allLeads = (leads ?? []) as Lead[];
  const activeLeads = allLeads.filter((l) => l.status !== "lost");
  const lostLeads = allLeads.filter((l) => l.status === "lost");

  return {
    ...employee,
    leads: allLeads,
    activeLeads,
    lostLeads,
    clients: (clients ?? []) as ClientOnboarding[],
  };
}
