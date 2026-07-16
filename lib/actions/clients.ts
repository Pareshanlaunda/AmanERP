"use server";

import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { publicActionError } from "@/lib/errors/public-error";
import { revalidateClientMutation, revalidateLeadMutation } from "@/lib/revalidate";
import {
  listAdditionalAssigneeIds,
  normalizeAdditionalAssigneeIds,
  replaceAdditionalAssignees,
} from "@/lib/leads/assignees";
import { assignClientSchema, type AssignClientInput } from "@/lib/validations/clients";

export type ActionResult = { success: true } | { success: false; error: string };

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
  const handoffFrom = parsed.data.from_owner_id;

  if (handoffFrom && newOwner === handoffFrom) {
    return { success: false, error: "Select a different employee" };
  }

  if (handoffFrom && previousOwner === newOwner) {
    return { success: true };
  }

  if (handoffFrom && previousOwner !== handoffFrom) {
    return {
      success: false,
      error: "This client is no longer owned by this employee. Refresh the page.",
    };
  }

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

  const employeeIds = [...new Set([newOwner, ...additionalIds])];
  const { data: profiles, error: profileError } = await createAdminClient()
    .from("profiles")
    .select("id, role, is_active")
    .in("id", employeeIds);

  if (
    profileError ||
    !profiles ||
    profiles.length !== employeeIds.length ||
    profiles.some((p) => p.role !== "employee") ||
    profiles.some((p) => p.is_active === false)
  ) {
    return { success: false, error: "Selected user is not an active employee" };
  }

  if (primaryChanged) {
    const clientWriter = handoffFrom ? createAdminClient() : supabase;
    let ownerQuery = clientWriter
      .from("client_onboardings")
      .update({
        submitted_by: newOwner,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.client_id);
    if (handoffFrom) {
      ownerQuery = ownerQuery.eq("submitted_by", handoffFrom);
    }

    const { data: ownerRows, error } = await ownerQuery.select("id");

    if (error) {
      return { success: false, error: publicActionError("Unable to reassign client", error) };
    }
    if (handoffFrom && !ownerRows?.length) {
      const { data: latest } = await createAdminClient()
        .from("client_onboardings")
        .select("submitted_by")
        .eq("id", parsed.data.client_id)
        .maybeSingle();
      if (latest?.submitted_by === newOwner) {
        revalidateClientMutation(parsed.data.client_id, {
          previousOwnerId: handoffFrom,
          newOwnerId: newOwner,
          leadId,
        });
        return { success: true };
      }
      return {
        success: false,
        error: "Client ownership changed. Refresh the page and try again.",
      };
    }
  }

  if (parsed.data.sync_lead !== false && leadId) {
    const leadWriter = handoffFrom ? createAdminClient() : supabase;
    const { data: linkedLead } = await leadWriter
      .from("leads")
      .select("id, status, assigned_to")
      .eq("id", leadId)
      .maybeSingle();

    if (linkedLead) {
      const currentStatus = linkedLead.status as string;
      const previousLeadOwner = linkedLead.assigned_to as string | null;
      const nextStatus =
        currentStatus === "converted" || currentStatus === "lost"
          ? currentStatus
          : currentStatus === "new" || currentStatus === "assigned"
            ? "assigned"
            : currentStatus;

      const { error: leadError } = await leadWriter
        .from("leads")
        .update({
          assigned_to: newOwner,
          assigned_at: new Date().toISOString(),
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (leadError) {
        if (primaryChanged) {
          await supabase
            .from("client_onboardings")
            .update({
              submitted_by: previousOwner,
              updated_at: new Date().toISOString(),
            })
            .eq("id", parsed.data.client_id);
        }
        return {
          success: false,
          error: publicActionError("Unable to sync linked lead", leadError),
        };
      }

      const { error: additionalError } = await replaceAdditionalAssignees(supabase, {
        leadId,
        employeeIds: additionalIds,
        assignedBy: user.id,
      });
      if (additionalError) {
        await replaceAdditionalAssignees(supabase, {
          leadId,
          employeeIds: previousAdditional,
          assignedBy: user.id,
        });
        await supabase
          .from("leads")
          .update({
            assigned_to: previousLeadOwner,
            status: currentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", leadId);
        if (primaryChanged) {
          await supabase
            .from("client_onboardings")
            .update({
              submitted_by: previousOwner,
              updated_at: new Date().toISOString(),
            })
            .eq("id", parsed.data.client_id);
        }
        return {
          success: false,
          error: publicActionError("Unable to update additional assignees", additionalError),
        };
      }

      await supabase
        .from("leads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", leadId);

      revalidateLeadMutation(leadId);
    }
  }

  const admin = createAdminClient();
  if (primaryChanged) {
    await admin.from("notifications").insert({
      user_id: newOwner,
      type: "lead_assigned",
      title: "Client assigned to you",
      body: `You are now the owner of client: ${client.client_name}`,
      lead_id: leadId,
    });
  }

  const newlyAdded = additionalIds.filter((id) => !previousAdditional.includes(id));
  if (newlyAdded.length > 0) {
    await admin.from("notifications").insert(
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
