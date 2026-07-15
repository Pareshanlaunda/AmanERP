"use server";

import { z } from "zod";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { publicActionError } from "@/lib/errors/public-error";
import {
  revalidateEmployeeDetail,
  revalidateLeadMutation,
} from "@/lib/revalidate";
import {
  addLeadUpdateSchema,
  assignLeadSchema,
  type AddLeadUpdateInput,
  type AssignLeadInput,
} from "@/lib/validations/leads";
import {
  formatOutcomeSummary,
  leadOutcomeSchema,
  type LeadOutcomeInput,
} from "@/lib/validations/lead-outcomes";
import type { LeadStatus, OutcomeCategory } from "@/lib/types/database";
import {
  listAdditionalAssigneeIds,
  normalizeAdditionalAssigneeIds,
  replaceAdditionalAssignees,
} from "@/lib/leads/assignees";

export type ActionResult =
  | { success: true; warning?: string }
  | { success: false; error: string };

/** Service role so employee→admin notify works (RLS would drop non-admin targets). */
async function createNotification(params: {
  user_id: string;
  type: "lead_assigned" | "lead_converted" | "lead_updated";
  title: string;
  body: string;
  lead_id: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(params);
  if (error) {
    console.error("[notifications] insert failed", error.message);
    return false;
  }
  return true;
}

async function notifyAssignees(params: {
  userIds: string[];
  clientName: string;
  leadId: string;
  assignmentComment: string | null;
  additional?: boolean;
}): Promise<boolean> {
  const unique = [...new Set(params.userIds.filter(Boolean))];
  const results = await Promise.all(
    unique.map((user_id) =>
      createNotification({
        user_id,
        type: "lead_assigned",
        title: params.additional ? "Lead shared with you" : "New lead assigned",
        body: params.assignmentComment
          ? `${params.clientName}: ${params.assignmentComment}`
          : params.additional
            ? `You were added as an additional assignee on lead: ${params.clientName}`
            : `You have been assigned lead: ${params.clientName}`,
        lead_id: params.leadId,
      })
    )
  );
  return results.every(Boolean);
}

async function assertEmployeeIds(ids: string[]): Promise<string | null> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return "Select an employee";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role")
    .in("id", unique);
  if (error) return publicActionError("Unable to verify employees", error);
  if (!data || data.length !== unique.length) return "Selected user is not an employee";
  if (data.some((row) => row.role !== "employee")) return "Selected user is not an employee";
  return null;
}

const STATUS_CONFLICT = "Lead was updated by someone else. Refresh and try again.";

/** Conditional status write — fails closed if expected status no longer matches. */
async function updateLeadIfStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  expectedStatus: string | string[],
  patch: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  let query = supabase.from("leads").update(patch).eq("id", leadId);
  query = Array.isArray(expectedStatus)
    ? query.in("status", expectedStatus)
    : query.eq("status", expectedStatus);

  const { data, error } = await query.select("id");
  if (error) {
    return { ok: false, error: publicActionError("Unable to update lead", error) };
  }
  if (!data?.length) return { ok: false, error: STATUS_CONFLICT };
  return { ok: true };
}

async function insertLeadUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown>
): Promise<string | null> {
  const { error } = await supabase.from("lead_updates").insert(row);
  if (error) {
    return publicActionError("Unable to save lead audit trail", error);
  }
  return null;
}

/** Undo a committed status write when audit trail insert fails. */
async function restoreLeadStatusAfterTrailFail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  fromStatus: string,
  restorePatch: Record<string, unknown>
): Promise<string> {
  const { error } = await supabase
    .from("leads")
    .update({ ...restorePatch, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("status", fromStatus);
  if (error) {
    console.error("[leads] status restore after trail fail", error.message);
    return publicActionError(
      "Lead updated but audit trail failed — refresh and check status",
      error
    );
  }
  return "Unable to save lead audit trail";
}

/** Fetch lead if current employee is primary or additional assignee. */
async function getLeadForAssignee<T extends { assigned_to?: string | null }>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  userId: string,
  select: string
): Promise<T | null> {
  const { data: lead, error } = await supabase
    .from("leads")
    .select(select)
    .eq("id", leadId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[leads] getLeadForAssignee failed", error.message);
    throw new Error("Unable to load lead");
  }
  if (!lead) return null;

  const row = lead as unknown as T;
  if (row.assigned_to === userId) return row;

  const additional = await listAdditionalAssigneeIds(supabase, leadId);
  if (additional.includes(userId)) return row;

  return null;
}

export async function assignLead(data: AssignLeadInput): Promise<ActionResult> {
  const user = await requireUserWithRole(["admin"]);
  const parsed = assignLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const supabase = await createClient();
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "client_name, assigned_to, status, onboarding_record_id, converted_onboarding_id, assignment_comment, assigned_at"
    )
    .eq("id", parsed.data.lead_id)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found" };
  }

  const additionalIds = normalizeAdditionalAssigneeIds(
    parsed.data.assigned_to,
    parsed.data.additional_assignee_ids
  );
  const employeeCheck = await assertEmployeeIds([parsed.data.assigned_to, ...additionalIds]);
  if (employeeCheck) return { success: false, error: employeeCheck };

  const previousAdditional = await listAdditionalAssigneeIds(supabase, parsed.data.lead_id);
  const previousPrimary = lead.assigned_to as string | null;
  const previousComment = (lead.assignment_comment as string | null) ?? null;
  const previousAssignedAt = (lead.assigned_at as string | null) ?? null;
  // undefined = leave unchanged; explicit string (incl. "") = set / clear
  const nextComment =
    parsed.data.assignment_comment === undefined
      ? previousComment
      : parsed.data.assignment_comment.trim() || null;
  const currentStatus = lead.status as string;
  // Don't pull converted/lost leads back to "assigned" when only changing owner
  const nextStatus =
    currentStatus === "converted" || currentStatus === "lost" ? currentStatus : "assigned";
  const nextAssignedAt = new Date().toISOString();

  // Conditional on current primary — concurrent admin assigns conflict instead of last-write-wins.
  let assignQuery = supabase
    .from("leads")
    .update({
      assigned_to: parsed.data.assigned_to,
      assigned_at: nextAssignedAt,
      assignment_comment: nextComment,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.lead_id);
  assignQuery = previousPrimary
    ? assignQuery.eq("assigned_to", previousPrimary)
    : assignQuery.is("assigned_to", null);

  const { data: assignedRows, error } = await assignQuery.select("id");
  if (error) return { success: false, error: publicActionError("Unable to assign lead", error) };
  if (!assignedRows?.length) {
    return {
      success: false,
      error: "Lead was reassigned by someone else. Refresh and try again.",
    };
  }

  const restoreLeadPrimary = async (): Promise<string | null> => {
    const { error: restoreError } = await supabase
      .from("leads")
      .update({
        assigned_to: previousPrimary,
        status: currentStatus,
        assignment_comment: previousComment,
        assigned_at: previousAssignedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.lead_id);
    if (restoreError) {
      console.error("[assignLead] restore failed", restoreError.message);
      return publicActionError(
        "Assign partially failed and could not restore previous assignee — check the lead",
        restoreError
      );
    }
    return null;
  };

  const { error: additionalError } = await replaceAdditionalAssignees(supabase, {
    leadId: parsed.data.lead_id,
    employeeIds: additionalIds,
    assignedBy: user.id,
  });
  if (additionalError) {
    const restoreMsg = await restoreLeadPrimary();
    return {
      success: false,
      error:
        restoreMsg ??
        publicActionError("Unable to update additional assignees", additionalError),
    };
  }

  // Bump lead after assignee rows exist so Realtime SELECT policies see co-assignees.
  await supabase
    .from("leads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", parsed.data.lead_id);

  let notifyOk = true;
  if (parsed.data.assigned_to !== previousPrimary) {
    const clientId =
      (lead.onboarding_record_id as string | null) ??
      (lead.converted_onboarding_id as string | null) ??
      null;

    if (clientId) {
      const { error: clientError } = await supabase
        .from("client_onboardings")
        .update({
          submitted_by: parsed.data.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);
      if (clientError) {
        await replaceAdditionalAssignees(supabase, {
          leadId: parsed.data.lead_id,
          employeeIds: previousAdditional,
          assignedBy: user.id,
        });
        const restoreMsg = await restoreLeadPrimary();
        return {
          success: false,
          error:
            restoreMsg ?? publicActionError("Unable to sync client owner", clientError),
        };
      }
    }

    notifyOk =
      (await notifyAssignees({
        userIds: [parsed.data.assigned_to],
        clientName: lead.client_name,
        leadId: parsed.data.lead_id,
        assignmentComment: nextComment,
      })) && notifyOk;
  }

  const newlyAdded = additionalIds.filter((id) => !previousAdditional.includes(id));
  if (newlyAdded.length > 0) {
    notifyOk =
      (await notifyAssignees({
        userIds: newlyAdded,
        clientName: lead.client_name,
        leadId: parsed.data.lead_id,
        assignmentComment: nextComment,
        additional: true,
      })) && notifyOk;
  }

  revalidateLeadMutation(parsed.data.lead_id);
  return notifyOk
    ? { success: true }
    : { success: true, warning: "Assignment saved, but notification failed — tell the employee manually" };
}

export async function addLeadUpdate(data: AddLeadUpdateInput): Promise<ActionResult> {
  const user = await requireUserWithRole(["employee"]);
  const parsed = addLeadUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const supabase = await createClient();
  const lead = await getLeadForAssignee<{
    status: string;
    client_name: string;
    created_by: string;
    assigned_to: string | null;
  }>(supabase, parsed.data.lead_id, user.id, "status, client_name, created_by, assigned_to");

  if (!lead) {
    return { success: false, error: "Lead not found or not assigned to you" };
  }

  const newStatus: LeadStatus =
    lead.status === "assigned" ? "in_progress" : (lead.status as LeadStatus);

  const { error: updateError } = await supabase.from("lead_updates").insert({
    lead_id: parsed.data.lead_id,
    updated_by: user.id,
    note: parsed.data.note.trim(),
    status: newStatus,
  });

  if (updateError) {
    return { success: false, error: publicActionError("Unable to save note", updateError) };
  }

  const { error: leadError } = await supabase
    .from("leads")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.lead_id);

  if (leadError) {
    return { success: false, error: publicActionError("Unable to update lead", leadError) };
  }

  const notified = await createNotification({
    user_id: lead.created_by,
    type: "lead_updated",
    title: "Lead progress update",
    body: `${lead.client_name}: ${parsed.data.note.trim()}`,
    lead_id: parsed.data.lead_id,
  });

  revalidateLeadMutation(parsed.data.lead_id);
  return notified
    ? { success: true }
    : { success: true, warning: "Note saved, but admin notification failed" };
}

export async function markLeadInProgress(leadId: string): Promise<ActionResult> {
  const user = await requireUserWithRole(["employee"]);
  const idParsed = z.string().uuid().safeParse(leadId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid lead id" };
  }

  const supabase = await createClient();

  const lead = await getLeadForAssignee<{ id: string; status: string; assigned_to: string | null }>(
    supabase,
    idParsed.data,
    user.id,
    "id, status, assigned_to"
  );

  if (!lead) {
    return { success: false, error: "Lead not found" };
  }

  if (lead.status === "converted" || lead.status === "lost") {
    return { success: false, error: "This lead is closed and cannot be started" };
  }
  if (lead.status !== "assigned") {
    return { success: false, error: "Lead is already in progress" };
  }

  const updated = await updateLeadIfStatus(supabase, idParsed.data, "assigned", {
    status: "in_progress",
    updated_at: new Date().toISOString(),
  });
  if (!updated.ok) return { success: false, error: updated.error };

  const trailError = await insertLeadUpdate(supabase, {
    lead_id: idParsed.data,
    updated_by: user.id,
    note: "Started working on this lead",
    status: "in_progress",
  });
  if (trailError) {
    return {
      success: false,
      error: await restoreLeadStatusAfterTrailFail(supabase, idParsed.data, "in_progress", {
        status: "assigned",
      }),
    };
  }

  revalidateLeadMutation(idParsed.data);
  return { success: true };
}

export async function markLeadSuccessful(
  leadId: string,
  outcome?: Pick<LeadOutcomeInput, "category" | "reason" | "notes">
): Promise<ActionResult> {
  const user = await requireUserWithRole(["employee"]);
  const idParsed = z.string().uuid().safeParse(leadId);
  if (!idParsed.success) {
    return { success: false, error: "Invalid lead id" };
  }

  const supabase = await createClient();

  const lead = await getLeadForAssignee<{
    id: string;
    status: string;
    client_name: string;
    created_by: string;
    onboarding_record_id: string | null;
    assigned_to: string | null;
  }>(
    supabase,
    idParsed.data,
    user.id,
    "id, status, client_name, created_by, onboarding_record_id, assigned_to"
  );

  if (!lead) {
    return { success: false, error: "Lead not found" };
  }

  if (lead.status !== "in_progress") {
    return { success: false, error: "Lead must be in progress" };
  }

  if (!lead.onboarding_record_id) {
    return { success: false, error: "Complete the onboarding form first" };
  }

  const updated = await updateLeadIfStatus(supabase, idParsed.data, "in_progress", {
    status: "converted",
    converted_onboarding_id: lead.onboarding_record_id,
    latest_outcome_category: outcome?.category ?? "successful",
    latest_outcome_reason: outcome?.reason ?? null,
    updated_at: new Date().toISOString(),
  });
  if (!updated.ok) return { success: false, error: updated.error };

  const note = outcome
    ? formatOutcomeSummary(outcome.category, outcome.reason, outcome.notes)
    : "Marked as successful — lead converted to client";

  const trailError = await insertLeadUpdate(supabase, {
    lead_id: idParsed.data,
    updated_by: user.id,
    note,
    status: "converted",
    outcome_category: outcome?.category ?? "successful",
    outcome_reason: outcome?.reason ?? null,
  });
  if (trailError) {
    return {
      success: false,
      error: await restoreLeadStatusAfterTrailFail(supabase, idParsed.data, "converted", {
        status: "in_progress",
        converted_onboarding_id: null,
        latest_outcome_category: null,
        latest_outcome_reason: null,
      }),
    };
  }

  const notified = await createNotification({
    user_id: lead.created_by,
    type: "lead_converted",
    title: "Lead converted to client",
    body: `${lead.client_name} was successfully onboarded by ${user.profile.full_name ?? user.email}`,
    lead_id: idParsed.data,
  });

  revalidateLeadMutation(idParsed.data);
  return notified
    ? { success: true }
    : { success: true, warning: "Lead converted, but admin notification failed" };
}

export async function recordLeadOutcome(data: LeadOutcomeInput): Promise<ActionResult> {
  const user = await requireUserWithRole(["employee"]);
  const parsed = leadOutcomeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  if (parsed.data.category === "successful") {
    return markLeadSuccessful(parsed.data.lead_id, parsed.data);
  }

  const supabase = await createClient();
  const lead = await getLeadForAssignee<{
    id: string;
    status: string;
    client_name: string;
    created_by: string;
    assigned_to: string | null;
    latest_outcome_category: string | null;
    latest_outcome_reason: string | null;
  }>(
    supabase,
    parsed.data.lead_id,
    user.id,
    "id, status, client_name, created_by, assigned_to, latest_outcome_category, latest_outcome_reason"
  );

  if (!lead) {
    return { success: false, error: "Lead not found" };
  }

  if (!["assigned", "in_progress"].includes(lead.status)) {
    return { success: false, error: "This lead cannot be updated in its current status" };
  }

  const summary = formatOutcomeSummary(parsed.data.category, parsed.data.reason, parsed.data.notes);
  const category = parsed.data.category as OutcomeCategory;
  const nextStatus: LeadStatus =
    lead.status === "assigned" && category !== "drop" ? "in_progress" : (lead.status as LeadStatus);

  if (category === "drop") {
    const updated = await updateLeadIfStatus(
      supabase,
      parsed.data.lead_id,
      ["assigned", "in_progress"],
      {
        status: "lost",
        lost_reason: summary,
        lost_at: new Date().toISOString(),
        lost_by: user.id,
        latest_outcome_category: category,
        latest_outcome_reason: parsed.data.reason,
        updated_at: new Date().toISOString(),
      }
    );
    if (!updated.ok) return { success: false, error: updated.error };

    const trailError = await insertLeadUpdate(supabase, {
      lead_id: parsed.data.lead_id,
      updated_by: user.id,
      note: summary,
      status: "lost",
      outcome_category: category,
      outcome_reason: parsed.data.reason,
    });
    if (trailError) {
      return {
        success: false,
        error: await restoreLeadStatusAfterTrailFail(supabase, parsed.data.lead_id, "lost", {
          status: lead.status,
          lost_reason: null,
          lost_at: null,
          lost_by: null,
          latest_outcome_category: lead.latest_outcome_category,
          latest_outcome_reason: lead.latest_outcome_reason,
        }),
      };
    }

    const notified = await createNotification({
      user_id: lead.created_by,
      type: "lead_updated",
      title: "Lead marked as lost",
      body: `${lead.client_name} was not converted. ${summary}`,
      lead_id: parsed.data.lead_id,
    });

    revalidateLeadMutation(parsed.data.lead_id);
    revalidateEmployeeDetail(user.id);
    return notified
      ? { success: true }
      : { success: true, warning: "Lead marked lost, but admin notification failed" };
  }

  const updated = await updateLeadIfStatus(supabase, parsed.data.lead_id, lead.status, {
    status: nextStatus,
    latest_outcome_category: category,
    latest_outcome_reason: parsed.data.reason,
    updated_at: new Date().toISOString(),
  });
  if (!updated.ok) return { success: false, error: updated.error };

  const trailError = await insertLeadUpdate(supabase, {
    lead_id: parsed.data.lead_id,
    updated_by: user.id,
    note: summary,
    status: nextStatus,
    outcome_category: category,
    outcome_reason: parsed.data.reason,
  });
  if (trailError) {
    return {
      success: false,
      error: await restoreLeadStatusAfterTrailFail(supabase, parsed.data.lead_id, nextStatus, {
        status: lead.status,
        latest_outcome_category: lead.latest_outcome_category,
        latest_outcome_reason: lead.latest_outcome_reason,
      }),
    };
  }

  const notified = await createNotification({
    user_id: lead.created_by,
    type: "lead_updated",
    title: category === "reschedule" ? "Lead rescheduled" : "Lead progress update",
    body: `${lead.client_name}: ${summary}`,
    lead_id: parsed.data.lead_id,
  });

  revalidateLeadMutation(parsed.data.lead_id);
  return notified
    ? { success: true }
    : { success: true, warning: "Lead updated, but admin notification failed" };
}

export async function markLeadLost(data: LeadOutcomeInput): Promise<ActionResult> {
  if (data.category !== "drop") {
    return { success: false, error: "Use recordLeadOutcome for this update" };
  }
  return recordLeadOutcome(data);
}
