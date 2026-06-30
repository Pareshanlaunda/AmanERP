"use server";

import { revalidatePath } from "next/cache";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import {
  addLeadUpdateSchema,
  assignLeadSchema,
  createLeadSchema,
  rejectLeadSchema,
  type AddLeadUpdateInput,
  type AssignLeadInput,
  type CreateLeadInput,
  type RejectLeadInput,
} from "@/lib/validations/leads";
import type { LeadStatus } from "@/lib/types/database";

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

export async function createLead(data: CreateLeadInput): Promise<ActionResult> {
  const user = await requireUserWithRole(["admin"]);
  const parsed = createLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const supabase = await createClient();
  const assignedTo = parsed.data.assigned_to ?? null;
  const assignmentComment = parsed.data.assignment_comment?.trim() || null;
  const isAssigned = !!assignedTo;

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      client_name: parsed.data.client_name.trim(),
      client_phone: parsed.data.client_phone?.trim() || null,
      client_alternate_phone: parsed.data.client_alternate_phone?.trim() || null,
      client_email: parsed.data.client_email?.trim() || null,
      loan_amount: parsed.data.loan_amount ?? null,
      loan_type: parsed.data.loan_type ?? null,
      notes: parsed.data.notes?.trim() || null,
      source: "manual",
      status: isAssigned ? "assigned" : "new",
      created_by: user.id,
      assigned_to: assignedTo,
      assigned_at: isAssigned ? new Date().toISOString() : null,
      assignment_comment: isAssigned ? assignmentComment : null,
    })
    .select("id, client_name")
    .single();

  if (error) return { success: false, error: error.message };

  if (isAssigned && lead) {
    await createNotification(supabase, {
      user_id: assignedTo,
      type: "lead_assigned",
      title: "New lead assigned",
      body: assignmentComment
        ? `${lead.client_name}: ${assignmentComment}`
        : `You have been assigned lead: ${lead.client_name}`,
      lead_id: lead.id,
    });
    revalidatePath("/employee/dashboard");
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function assignLead(data: AssignLeadInput): Promise<ActionResult> {
  await requireUserWithRole(["admin"]);
  const parsed = assignLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const supabase = await createClient();
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("client_name")
    .eq("id", parsed.data.lead_id)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found" };
  }

  const { error } = await supabase
    .from("leads")
    .update({
      assigned_to: parsed.data.assigned_to,
      assigned_at: new Date().toISOString(),
      assignment_comment: parsed.data.assignment_comment?.trim() || null,
      status: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.lead_id);

  if (error) return { success: false, error: error.message };

  await createNotification(supabase, {
    user_id: parsed.data.assigned_to,
    type: "lead_assigned",
    title: "New lead assigned",
    body: parsed.data.assignment_comment
      ? `${lead.client_name}: ${parsed.data.assignment_comment}`
      : `You have been assigned lead: ${lead.client_name}`,
    lead_id: parsed.data.lead_id,
  });

  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/leads/${parsed.data.lead_id}`);
  revalidatePath("/employee/dashboard");
  return { success: true };
}

export async function addLeadUpdate(data: AddLeadUpdateInput): Promise<ActionResult> {
  const user = await requireUserWithRole(["employee"]);
  const parsed = addLeadUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const supabase = await createClient();
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("status, client_name, created_by")
    .eq("id", parsed.data.lead_id)
    .eq("assigned_to", user.id)
    .single();

  if (fetchError || !lead) {
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

  revalidatePath("/employee/dashboard");
  revalidatePath(`/employee/leads/${parsed.data.lead_id}`);
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function markLeadInProgress(leadId: string): Promise<ActionResult> {
  const user = await requireUserWithRole(["employee"]);
  const supabase = await createClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, status")
    .eq("id", leadId)
    .eq("assigned_to", user.id)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found" };
  }

  if (lead.status !== "assigned") {
    return { success: false, error: "Lead is already in progress" };
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) return { success: false, error: error.message };

  await supabase.from("lead_updates").insert({
    lead_id: leadId,
    updated_by: user.id,
    note: "Started working on this lead",
    status: "in_progress",
  });

  revalidatePath("/employee/dashboard");
  revalidatePath(`/employee/leads/${leadId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

export async function markLeadSuccessful(leadId: string): Promise<ActionResult> {
  const user = await requireUserWithRole(["employee"]);
  const supabase = await createClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, status, client_name, created_by, onboarding_record_id")
    .eq("id", leadId)
    .eq("assigned_to", user.id)
    .single();

  if (fetchError || !lead) {
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) return { success: false, error: error.message };

  await supabase.from("lead_updates").insert({
    lead_id: leadId,
    updated_by: user.id,
    note: "Marked as successful — lead converted to client",
    status: "converted",
  });

  await createNotification(supabase, {
    user_id: lead.created_by,
    type: "lead_converted",
    title: "Lead converted to client",
    body: `${lead.client_name} was successfully onboarded by ${user.profile.full_name ?? user.email}`,
    lead_id: leadId,
  });

  revalidatePath("/employee/dashboard");
  revalidatePath(`/employee/leads/${leadId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

export async function markLeadLost(data: RejectLeadInput): Promise<ActionResult> {
  const user = await requireUserWithRole(["employee"]);
  const parsed = rejectLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const supabase = await createClient();
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, status, client_name, created_by")
    .eq("id", parsed.data.lead_id)
    .eq("assigned_to", user.id)
    .single();

  if (fetchError || !lead) {
    return { success: false, error: "Lead not found" };
  }

  if (!["assigned", "in_progress"].includes(lead.status)) {
    return { success: false, error: "This lead cannot be marked as lost in its current status" };
  }

  const reason = parsed.data.reason.trim();

  const { error } = await supabase
    .from("leads")
    .update({
      status: "lost",
      lost_reason: reason,
      lost_at: new Date().toISOString(),
      lost_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.lead_id);

  if (error) return { success: false, error: error.message };

  await supabase.from("lead_updates").insert({
    lead_id: parsed.data.lead_id,
    updated_by: user.id,
    note: `Lead marked as lost: ${reason}`,
    status: "lost",
  });

  await createNotification(supabase, {
    user_id: lead.created_by,
    type: "lead_updated",
    title: "Lead marked as lost",
    body: `${lead.client_name} was not converted. Reason: ${reason}`,
    lead_id: parsed.data.lead_id,
  });

  revalidatePath("/employee/dashboard");
  revalidatePath(`/employee/leads/${parsed.data.lead_id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/leads/${parsed.data.lead_id}`);
  revalidatePath(`/admin/employees/${user.id}`);
  return { success: true };
}

export async function notifyLeadConverted(
  leadId: string,
  clientName: string,
  employeeName: string,
  adminUserId: string
) {
  const supabase = await createClient();
  await createNotification(supabase, {
    user_id: adminUserId,
    type: "lead_converted",
    title: "Lead converted to client",
    body: `${clientName} was onboarded by ${employeeName}`,
    lead_id: leadId,
  });
}
