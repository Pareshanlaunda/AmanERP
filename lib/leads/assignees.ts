import type { SupabaseClient } from "@supabase/supabase-js";
import { publicActionError } from "@/lib/errors/public-error";

/** Normalize additional IDs: unique, exclude primary, drop empties. */
export function normalizeAdditionalAssigneeIds(
  primaryId: string | null | undefined,
  additionalIds: string[] | null | undefined
): string[] {
  if (!additionalIds?.length) return [];
  const primary = primaryId?.trim() || null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of additionalIds) {
    const id = raw?.trim();
    if (!id || id === primary || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

type AssigneeRow = { employee_id: string; lead_id?: string };

/** Server/user/admin clients all share this shape for assignee ops. */
type DbClient = SupabaseClient;

export async function listAdditionalAssigneeIds(
  supabase: DbClient,
  leadId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("lead_additional_assignees")
    .select("employee_id")
    .eq("lead_id", leadId);

  if (error) {
    console.error("[assignees] listAdditionalAssigneeIds failed", error.message);
    throw new Error("Unable to load additional assignees");
  }
  if (!data) return [];
  return (data as AssigneeRow[]).map((row) => row.employee_id);
}

export async function listAdditionalAssigneeIdsForLeads(
  supabase: DbClient,
  leadIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (leadIds.length === 0) return map;

  const { data, error } = await supabase
    .from("lead_additional_assignees")
    .select("lead_id, employee_id")
    .in("lead_id", leadIds);

  if (error) {
    console.error("[assignees] listAdditionalAssigneeIdsForLeads failed", error.message);
    throw new Error("Unable to load additional assignees");
  }
  if (!data) return map;

  for (const row of data as AssigneeRow[]) {
    if (!row.lead_id) continue;
    const list = map.get(row.lead_id) ?? [];
    list.push(row.employee_id);
    map.set(row.lead_id, list);
  }
  return map;
}

/**
 * Replace additional assignees for a lead.
 * Prefers atomic SECURITY DEFINER RPC via service_role; falls back to delete+insert with restore.
 */
export async function replaceAdditionalAssignees(
  supabase: DbClient,
  params: {
    leadId: string;
    employeeIds: string[];
    assignedBy: string;
  }
): Promise<{ error: string | null }> {
  // Prefer service_role so RPC works even when caller JWT is not admin claim-ready.
  let writer: DbClient = supabase;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    writer = createAdminClient();
  } catch {
    writer = supabase;
  }

  const { error } = await writer.rpc("replace_lead_additional_assignees", {
    p_lead_id: params.leadId,
    p_employee_ids: params.employeeIds,
    p_assigned_by: params.assignedBy,
  });
  if (!error) return { error: null };
  if (!/function|permission|does not exist|pgrst202/i.test(error.message)) {
    return { error: publicActionError("Unable to update additional assignees", error) };
  }
  console.warn("[assignees] RPC unavailable, using fallback", error.message);

  const previous = await listAdditionalAssigneeIds(writer, params.leadId);

  const { error: deleteError } = await writer
    .from("lead_additional_assignees")
    .delete()
    .eq("lead_id", params.leadId);

  if (deleteError) {
    return { error: publicActionError("Unable to update additional assignees", deleteError) };
  }

  if (params.employeeIds.length === 0) return { error: null };

  const { error: insertError } = await writer.from("lead_additional_assignees").insert(
    params.employeeIds.map((employee_id) => ({
      lead_id: params.leadId,
      employee_id,
      assigned_by: params.assignedBy,
    }))
  );

  if (insertError) {
    if (previous.length > 0) {
      await writer.from("lead_additional_assignees").insert(
        previous.map((employee_id) => ({
          lead_id: params.leadId,
          employee_id,
          assigned_by: params.assignedBy,
        }))
      );
    }
    return { error: publicActionError("Unable to update additional assignees", insertError) };
  }
  return { error: null };
}

/** Lead is visible to this employee as primary or additional assignee. */
export function isEmployeeOnLead(
  lead: { assigned_to: string | null; additional_assignee_ids?: string[] | null },
  userId: string
): boolean {
  if (lead.assigned_to === userId) return true;
  return (lead.additional_assignee_ids ?? []).includes(userId);
}

/**
 * Realtime `leads` payloads omit join-only `additional_assignee_ids`.
 * Preserve previous list so UI / next save do not wipe co-assignees.
 */
export function mergeLeadRealtimeRow<
  T extends { id: string; additional_assignee_ids?: string[] | null },
>(previous: T | undefined, incoming: T): T {
  if (!previous) return incoming;
  if (incoming.additional_assignee_ids != null) return incoming;
  return {
    ...incoming,
    additional_assignee_ids: previous.additional_assignee_ids ?? [],
  };
}
