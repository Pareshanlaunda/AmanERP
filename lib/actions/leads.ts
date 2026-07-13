"use server";

import { z } from "zod";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
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

export type ActionResult = { success: true } | { success: false; error: string };

async function createNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    user_id: string;
    type: "lead_assigned" | "lead_converted" | "lead_updated";
    title: string;
    body: string;
    lead_id: string;
  }
) {
  await supabase.from("notifications").insert(params);
}

async function notifyAssignees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    userIds: string[];
    clientName: string;
    leadId: string;
    assignmentComment: string | null;
    additional?: boolean;
  }
) {
  const unique = [...new Set(params.userIds.filter(Boolean))];
  await Promise.all(
    unique.map((user_id) =>
      createNotification(supabase, {
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

  if (error || !lead) return null;

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
    .select("client_name, assigned_to, status, onboarding_record_id, converted_onboarding_id")
    .eq("id", parsed.data.lead_id)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found" };
  }

  const additionalIds = normalizeAdditionalAssigneeIds(
    parsed.data.assigned_to,
    parsed.data.additional_assignee_ids
  );
  const previousAdditional = await listAdditionalAssigneeIds(supabase, parsed.data.lead_id);
  const previousPrimary = lead.assigned_to as string | null;
  const assignmentComment = parsed.data.assignment_comment?.trim() || null;
  const currentStatus = lead.status as string;
  // Don't pull converted/lost leads back to "assigned" when only changing owner
  const nextStatus =
    currentStatus === "converted" || currentStatus === "lost" ? currentStatus : "assigned";

  const { error } = await supabase
    .from("leads")
    .update({
      assigned_to: parsed.data.assigned_to,
      assigned_at: new Date().toISOString(),
      assignment_comment: assignmentComment,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.lead_id);

  if (error) return { success: false, error: error.message };

  const { error: additionalError } = await replaceAdditionalAssignees(supabase, {
    leadId: parsed.data.lead_id,
    employeeIds: additionalIds,
    assignedBy: user.id,
  });
  if (additionalError) return { success: false, error: additionalError };

  // Keep linked client ownership in sync with primary assignee
  if (parsed.data.assigned_to !== previousPrimary) {
    const clientId =
      (lead.onboarding_record_id as string | null) ??
      (lead.converted_onboarding_id as string | null) ??
      null;

    if (clientId) {
      await supabase
        .from("client_onboardings")
        .update({
          submitted_by: parsed.data.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);
    }

    await notifyAssignees(supabase, {
      userIds: [parsed.data.assigned_to],
      clientName: lead.client_name,
      leadId: parsed.data.lead_id,
      assignmentComment,
    });
  }

  const newlyAdded = additionalIds.filter((id) => !previousAdditional.includes(id));
  if (newlyAdded.length > 0) {
    await notifyAssignees(supabase, {
      userIds: newlyAdded,
      clientName: lead.client_name,
      leadId: parsed.data.lead_id,
      assignmentComment,
      additional: true,
    });
  }

  revalidateLeadMutation(parsed.data.lead_id);
  return { success: true };
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

  if (updateError) return { success: false, error: updateError.message };

  const { error: leadError } = await supabase
    .from("leads")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.lead_id);

  if (leadError) return { success: false, error: leadError.message };

  await createNotification(supabase, {
    user_id: lead.created_by,
    type: "lead_updated",
    title: "Lead progress update",
    body: `${lead.client_name}: ${parsed.data.note.trim()}`,
    lead_id: parsed.data.lead_id,
  });

  revalidateLeadMutation(parsed.data.lead_id);
  return { success: true };
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

  if (lead.status !== "assigned") {
    return { success: false, error: "Lead is already in progress" };
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", idParsed.data);

  if (error) return { success: false, error: error.message };

  await supabase.from("lead_updates").insert({
    lead_id: idParsed.data,
    updated_by: user.id,
    note: "Started working on this lead",
    status: "in_progress",
  });

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

  const { error } = await supabase
    .from("leads")
    .update({
      status: "converted",
      converted_onboarding_id: lead.onboarding_record_id,
      latest_outcome_category: outcome?.category ?? "successful",
      latest_outcome_reason: outcome?.reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idParsed.data);

  if (error) return { success: false, error: error.message };

  const note = outcome
    ? formatOutcomeSummary(outcome.category, outcome.reason, outcome.notes)
    : "Marked as successful — lead converted to client";

  await supabase.from("lead_updates").insert({
    lead_id: idParsed.data,
    updated_by: user.id,
    note,
    status: "converted",
    outcome_category: outcome?.category ?? "successful",
    outcome_reason: outcome?.reason ?? null,
  });

  await createNotification(supabase, {
    user_id: lead.created_by,
    type: "lead_converted",
    title: "Lead converted to client",
    body: `${lead.client_name} was successfully onboarded by ${user.profile.full_name ?? user.email}`,
    lead_id: idParsed.data,
  });

  revalidateLeadMutation(idParsed.data);
  return { success: true };
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
  }>(supabase, parsed.data.lead_id, user.id, "id, status, client_name, created_by, assigned_to");

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
    const { error } = await supabase
      .from("leads")
      .update({
        status: "lost",
        lost_reason: summary,
        lost_at: new Date().toISOString(),
        lost_by: user.id,
        latest_outcome_category: category,
        latest_outcome_reason: parsed.data.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.lead_id);

    if (error) return { success: false, error: error.message };

    await supabase.from("lead_updates").insert({
      lead_id: parsed.data.lead_id,
      updated_by: user.id,
      note: summary,
      status: "lost",
      outcome_category: category,
      outcome_reason: parsed.data.reason,
    });

    await createNotification(supabase, {
      user_id: lead.created_by,
      type: "lead_updated",
      title: "Lead marked as lost",
      body: `${lead.client_name} was not converted. ${summary}`,
      lead_id: parsed.data.lead_id,
    });

    revalidateLeadMutation(parsed.data.lead_id);
    revalidateEmployeeDetail(user.id);
    return { success: true };
  }

  const { error: leadError } = await supabase
    .from("leads")
    .update({
      status: nextStatus,
      latest_outcome_category: category,
      latest_outcome_reason: parsed.data.reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.lead_id);

  if (leadError) return { success: false, error: leadError.message };

  await supabase.from("lead_updates").insert({
    lead_id: parsed.data.lead_id,
    updated_by: user.id,
    note: summary,
    status: nextStatus,
    outcome_category: category,
    outcome_reason: parsed.data.reason,
  });

  await createNotification(supabase, {
    user_id: lead.created_by,
    type: "lead_updated",
    title: category === "reschedule" ? "Lead rescheduled" : "Lead progress update",
    body: `${lead.client_name}: ${summary}`,
    lead_id: parsed.data.lead_id,
  });

  revalidateLeadMutation(parsed.data.lead_id);
  return { success: true };
}

export async function markLeadLost(data: LeadOutcomeInput): Promise<ActionResult> {
  if (data.category !== "drop") {
    return { success: false, error: "Use recordLeadOutcome for this update" };
  }
  return recordLeadOutcome(data);
}
