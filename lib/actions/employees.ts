"use server";

import { notFound } from "next/navigation";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/queries/auth-users";
import { getEmployeeProfilesFromDb } from "@/lib/queries/profiles";
import type { EmployeeStats, Lead, Profile } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { listAdditionalAssigneeIdsForLeads } from "@/lib/leads/assignees";

/** Soft cap for detail tables; stats RPC remains uncapped. */
const EMPLOYEE_DETAIL_LIST_LIMIT = 1000;

type LeadStatEntry = {
  assigned: number;
  in_progress: number;
  converted: number;
  total: number;
};

function emptyLeadStats(): LeadStatEntry {
  return { assigned: 0, in_progress: 0, converted: 0, total: 0 };
}

function applyLeadStatRow(
  leadStats: Map<string, LeadStatEntry>,
  employeeId: string | null | undefined,
  status: string | null | undefined,
  countRaw: string | number | null | undefined
) {
  if (!employeeId || !status) return;
  const count = Number(countRaw) || 0;
  if (count <= 0) return;

  const entry = leadStats.get(employeeId) ?? emptyLeadStats();
  entry.total += count;
  if (status === "assigned") entry.assigned += count;
  if (status === "in_progress") entry.in_progress += count;
  if (status === "converted" || status === "successful") entry.converted += count;
  leadStats.set(employeeId, entry);
}

function bumpLeadBucket(
  buckets: Map<string, number>,
  employeeId: string | null | undefined,
  status: string | null | undefined
) {
  if (!employeeId || !status) return;
  const key = `${employeeId}\0${status}`;
  buckets.set(key, (buckets.get(key) ?? 0) + 1);
}

/** Fallback when RPC fails — primary + co-assignees; service_role bypasses RLS. */
async function fetchLeadStatsFromTables(admin: ReturnType<typeof createAdminClient>) {
  const leadStats = new Map<string, LeadStatEntry>();
  const clientCounts = new Map<string, number>();

  const [leadsRes, additionalRes, clientsRes] = await Promise.all([
    admin.from("leads").select("id, assigned_to, status").not("assigned_to", "is", null),
    admin.from("lead_additional_assignees").select("lead_id, employee_id"),
    admin.from("client_onboardings").select("submitted_by").not("submitted_by", "is", null),
  ]);

  if (leadsRes.error || additionalRes.error || clientsRes.error) {
    const detail =
      leadsRes.error?.message ?? additionalRes.error?.message ?? clientsRes.error?.message;
    console.error("[employee-stats] table scan failed", detail);
    throw new Error("Unable to load employee stats");
  }

  const statusByLeadId = new Map<string, string>();
  const primaryByLeadId = new Map<string, string>();
  const leadBuckets = new Map<string, number>();

  for (const row of leadsRes.data ?? []) {
    const leadId = row.id as string;
    const empId = row.assigned_to as string | null;
    const status = row.status as string | null;
    if (leadId && status) statusByLeadId.set(leadId, status);
    if (leadId && empId) primaryByLeadId.set(leadId, empId);
    bumpLeadBucket(leadBuckets, empId, status);
  }

  for (const row of additionalRes.data ?? []) {
    const leadId = row.lead_id as string;
    const empId = row.employee_id as string | null;
    const status = statusByLeadId.get(leadId);
    const primary = primaryByLeadId.get(leadId);
    if (!empId || !status || empId === primary) continue;
    bumpLeadBucket(leadBuckets, empId, status);
  }

  for (const [key, count] of leadBuckets) {
    const [empId, status] = key.split("\0");
    applyLeadStatRow(leadStats, empId, status, count);
  }

  for (const row of clientsRes.data ?? []) {
    const empId = row.submitted_by as string | null;
    if (!empId) continue;
    clientCounts.set(empId, (clientCounts.get(empId) ?? 0) + 1);
  }

  return { leadStats, clientCounts };
}

async function fetchAggregatedEmployeeStats(admin: ReturnType<typeof createAdminClient>) {
  const [leadRpc, clientRpc] = await Promise.all([
    admin.rpc("get_employee_lead_stats"),
    admin.rpc("get_employee_client_counts"),
  ]);

  if (leadRpc.error || clientRpc.error) {
    console.error(
      "[employee-stats] RPC failed, falling back to table scan",
      leadRpc.error?.message ?? clientRpc.error?.message
    );
    return fetchLeadStatsFromTables(admin);
  }

  const leadStats = new Map<string, LeadStatEntry>();
  type RpcLeadRow = { employee_id: string | null; status: string; count: string | number };
  for (const row of (leadRpc.data ?? []) as RpcLeadRow[]) {
    applyLeadStatRow(leadStats, row.employee_id, row.status, row.count);
  }

  const clientCounts = new Map<string, number>();
  type RpcClientRow = { employee_id: string | null; count: string | number };
  for (const row of (clientRpc.data ?? []) as RpcClientRow[]) {
    if (row.employee_id) {
      clientCounts.set(row.employee_id, Number(row.count) || 0);
    }
  }

  return { leadStats, clientCounts };
}

function toEmployeeStats(
  profile: {
    id: string;
    employee_code: string | null;
    full_name: string | null;
    employee_type: string | null;
    address: string | null;
    mobile: string | null;
    created_at: string;
  },
  authUser: { email?: string; user_metadata?: { full_name?: string }; created_at?: string } | undefined,
  leadStats: Map<string, LeadStatEntry>,
  clientCounts: Map<string, number>
): EmployeeStats {
  const counts = leadStats.get(profile.id);
  return {
    id: profile.id,
    employee_code: profile.employee_code ?? null,
    full_name:
      profile.full_name ??
      authUser?.user_metadata?.full_name ??
      authUser?.email?.split("@")[0] ??
      "Employee",
    role: "employee",
    employee_type: (profile.employee_type as Profile["employee_type"]) ?? "general",
    address: profile.address ?? null,
    mobile: profile.mobile ?? null,
    created_at: profile.created_at ?? authUser?.created_at ?? new Date().toISOString(),
    email: authUser?.email,
    assigned_count: counts?.assigned ?? 0,
    in_progress_count: counts?.in_progress ?? 0,
    converted_count: counts?.converted ?? 0,
    total_leads: counts?.total ?? 0,
    total_clients: clientCounts.get(profile.id) ?? 0,
  };
}

async function buildEmployeeStatsList(): Promise<EmployeeStats[]> {
  await requireUserWithRole(["admin"]);
  const admin = createAdminClient();

  const [employeeProfiles, authUsers, { leadStats, clientCounts }] = await Promise.all([
    getEmployeeProfilesFromDb(),
    listAllAuthUsers(),
    fetchAggregatedEmployeeStats(admin),
  ]);

  const authMetaById = new Map(authUsers.map((u) => [u.id, u]));

  const stats: EmployeeStats[] = employeeProfiles.map((profile) =>
    toEmployeeStats(profile, authMetaById.get(profile.id), leadStats, clientCounts)
  );

  return stats.sort((a, b) =>
    (a.full_name ?? "").localeCompare(b.full_name ?? "", undefined, { sensitivity: "base" })
  );
}

async function getEmployeeStatsForId(employeeId: string): Promise<EmployeeStats | null> {
  const admin = createAdminClient();

  const [{ data: profile, error: profileError }, authUsers, { leadStats, clientCounts }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, employee_code, full_name, role, employee_type, address, mobile, created_at")
        .eq("id", employeeId)
        .maybeSingle(),
      listAllAuthUsers(),
      fetchAggregatedEmployeeStats(admin),
    ]);

  if (profileError) {
    console.error("[employee-stats] profile fetch failed", profileError.message);
    throw new Error("Unable to load employee");
  }
  if (!profile || profile.role !== "employee") return null;

  const authUser = authUsers.find((u) => u.id === employeeId);
  return toEmployeeStats(
    {
      id: profile.id,
      employee_code: (profile.employee_code as string | null) ?? null,
      full_name: profile.full_name as string | null,
      employee_type: (profile.employee_type as string | null) ?? null,
      address: (profile.address as string | null) ?? null,
      mobile: (profile.mobile as string | null) ?? null,
      created_at: profile.created_at as string,
    },
    authUser,
    leadStats,
    clientCounts
  );
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
    employee_code: profile.employee_code ?? null,
    full_name:
      profile.full_name ??
      authMetaById.get(profile.id)?.user_metadata?.full_name ??
      authMetaById.get(profile.id)?.email?.split("@")[0] ??
      "Employee",
    role: "employee" as const,
    employee_type: (profile.employee_type as Profile["employee_type"]) ?? "general",
    address: profile.address ?? null,
    mobile: profile.mobile ?? null,
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

  const [primaryRes, additionalRes, clientsRes] = await Promise.all([
    admin
      .from("leads")
      .select("*")
      .eq("assigned_to", employeeId)
      .order("assigned_at", { ascending: false })
      .limit(EMPLOYEE_DETAIL_LIST_LIMIT),
    admin.from("lead_additional_assignees").select("lead_id").eq("employee_id", employeeId),
    admin
      .from("client_onboardings")
      .select("*")
      .eq("submitted_by", employeeId)
      .order("created_at", { ascending: false })
      .limit(EMPLOYEE_DETAIL_LIST_LIMIT),
  ]);

  if (primaryRes.error || additionalRes.error || clientsRes.error) {
    console.error(
      "[employee-detail] list fetch failed",
      primaryRes.error?.message ?? additionalRes.error?.message ?? clientsRes.error?.message
    );
    throw new Error("Unable to load employee detail");
  }

  const primary = (primaryRes.data ?? []) as Lead[];
  const extraIds = (additionalRes.data ?? [])
    .map((row) => row.lead_id as string)
    .filter((id) => !primary.some((l) => l.id === id));

  let additional: Lead[] = [];
  if (extraIds.length > 0) {
    const { data, error } = await admin
      .from("leads")
      .select("*")
      .in("id", extraIds)
      .order("assigned_at", { ascending: false })
      .limit(EMPLOYEE_DETAIL_LIST_LIMIT);
    if (error) {
      console.error("[employee-detail] additional leads failed", error.message);
      throw new Error("Unable to load employee detail");
    }
    additional = (data ?? []) as Lead[];
  }

  const merged = [...primary, ...additional];
  const assigneeMap = await listAdditionalAssigneeIdsForLeads(
    admin,
    merged.map((l) => l.id)
  );
  const allLeads = merged.map((lead) => ({
    ...lead,
    additional_assignee_ids: assigneeMap.get(lead.id) ?? [],
  }));
  const closed = new Set(["lost", "converted", "successful"]);
  const activeLeads = allLeads.filter((l) => !closed.has(l.status));
  const lostLeads = allLeads.filter((l) => l.status === "lost");

  return {
    ...employee,
    leads: allLeads,
    activeLeads,
    lostLeads,
    clients: (clientsRes.data ?? []) as ClientOnboarding[],
  };
}
