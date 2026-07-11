"use server";

import { requireUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { revalidateClientMutation, revalidateLeadMutation } from "@/lib/revalidate";
import {
  listAdditionalAssigneeIds,
  normalizeAdditionalAssigneeIds,
  replaceAdditionalAssignees,
} from "@/lib/leads/assignees";
import { z } from "zod";

export type ActionResult = { success: true } | { success: false; error: string };

export const assignClientSchema = z.object({
  client_id: z.string().uuid(),
  submitted_by: z.string().uuid(),
  additional_assignee_ids: z.array(z.string().uuid()).optional(),
  /** When true (default), also sync linked lead primary + additional assignees. */
  sync_lead: z.boolean().optional().default(true),
});

export type AssignClientInput = z.infer<typeof assignClientSchema>;

export async function assignClient(data: AssignClientInput): Promise<ActionResult> {
  const user = await requireUserWithRole(["admin"]);
  const parsed = assignClientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const supabase = await createClient();
  const { data: client, error: fetchError } = await supabase
    .from("client_onboardings")
    .select("id, client_name, submitted_by, lead_id")
    .eq("id", parsed.data.client_id)
    .single();

  if (fetchError || !client) {
    return { success: false, error: "Client not found" };
  }

  const previousOwner = client.submitted_by as string;
  const newOwner = parsed.data.submitted_by;
  const additionalIds = normalizeAdditionalAssigneeIds(
    newOwner,
    parsed.data.additional_assignee_ids
  );

  const leadId = (client.lead_id as string | null) ?? null;
  const previousAdditional = leadId
    ? await listAdditionalAssigneeIds(supabase, leadId)
    : [];

  const primaryChanged = previousOwner !== newOwner;
  const additionalChanged =
    additionalIds.length !== previousAdditional.length ||
    additionalIds.some((id) => !previousAdditional.includes(id));

  if (!primaryChanged && !additionalChanged) {
    return { success: true };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", newOwner)
    .single();

  if (!profile || profile.role !== "employee") {
    return { success: false, error: "Selected user is not an employee" };
  }

  if (primaryChanged) {
    const { error } = await supabase
      .from("client_onboardings")
      .update({
        submitted_by: newOwner,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.client_id);

    if (error) return { success: false, error: error.message };
  }

  if (parsed.data.sync_lead !== false && leadId) {
    const { data: linkedLead } = await supabase
      .from("leads")
      .select("id, status, assigned_to")
      .eq("id", leadId)
      .maybeSingle();

    if (linkedLead) {
      const currentStatus = linkedLead.status as string;
      const nextStatus =
        currentStatus === "converted" || currentStatus === "lost"
          ? currentStatus
          : currentStatus === "new" || currentStatus === "assigned"
            ? "assigned"
            : currentStatus;

      const { error: leadError } = await supabase
        .from("leads")
        .update({
          assigned_to: newOwner,
          assigned_at: new Date().toISOString(),
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (leadError) {
        return {
          success: false,
          error: `Client updated, but lead update failed: ${leadError.message}`,
        };
      }

      const { error: additionalError } = await replaceAdditionalAssignees(supabase, {
        leadId,
        employeeIds: additionalIds,
        assignedBy: user.id,
      });
      if (additionalError) {
        return {
          success: false,
          error: `Client updated, but additional assignees failed: ${additionalError}`,
        };
      }

      revalidateLeadMutation(leadId);
    }
  }

  if (primaryChanged) {
    await supabase.from("notifications").insert({
      user_id: newOwner,
      type: "lead_assigned",
      title: "Client assigned to you",
      body: `You are now the owner of client: ${client.client_name}`,
      lead_id: leadId,
    });
  }

  const newlyAdded = additionalIds.filter((id) => !previousAdditional.includes(id));
  if (newlyAdded.length > 0) {
    await supabase.from("notifications").insert(
      newlyAdded.map((user_id) => ({
        user_id,
        type: "lead_assigned" as const,
        title: "Client shared with you",
        body: `You were added as an additional assignee on client: ${client.client_name}`,
        lead_id: leadId,
      }))
    );
  }

  revalidateClientMutation(parsed.data.client_id, {
    previousOwnerId: previousOwner,
    newOwnerId: newOwner,
    leadId,
  });

  return { success: true };
}
