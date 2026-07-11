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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any };

export async function listAdditionalAssigneeIds(
  supabase: AnyClient,
  leadId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("lead_additional_assignees")
    .select("employee_id")
    .eq("lead_id", leadId);

  if (error || !data) return [];
  return (data as AssigneeRow[]).map((row) => row.employee_id);
}

export async function listAdditionalAssigneeIdsForLeads(
  supabase: AnyClient,
  leadIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (leadIds.length === 0) return map;

  const { data, error } = await supabase
    .from("lead_additional_assignees")
    .select("lead_id, employee_id")
    .in("lead_id", leadIds);

  if (error || !data) return map;

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
 * Caller must be admin (RLS). Does not touch primary assigned_to.
 */
export async function replaceAdditionalAssignees(
  supabase: AnyClient,
  params: {
    leadId: string;
    employeeIds: string[];
    assignedBy: string;
  }
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase
    .from("lead_additional_assignees")
    .delete()
    .eq("lead_id", params.leadId);

  if (deleteError) return { error: deleteError.message };

  if (params.employeeIds.length === 0) return { error: null };

  const { error: insertError } = await supabase.from("lead_additional_assignees").insert(
    params.employeeIds.map((employee_id) => ({
      lead_id: params.leadId,
      employee_id,
      assigned_by: params.assignedBy,
    }))
  );

  if (insertError) return { error: insertError.message };
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
