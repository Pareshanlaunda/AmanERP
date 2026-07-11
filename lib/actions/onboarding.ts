"use server";

import { redirect } from "next/navigation";
import { sendAdvocateEmail } from "@/lib/email";
import { getUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import {
  onboardingFormSchema,
  toDbPayload,
  type ClientOnboarding,
  type OnboardingFormValues,
} from "@/lib/validations/onboarding";
import {
  listAdditionalAssigneeIds,
  replaceAdditionalAssignees,
} from "@/lib/leads/assignees";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmitOnboardingResult =
  | { success: true }
  | { success: false; error: string };

export async function submitOnboarding(
  data: OnboardingFormValues,
  leadId?: string | null
): Promise<SubmitOnboardingResult> {
  const parsed = onboardingFormSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid form data" };
  }

  const current = await getUserWithRole();
  if (!current) {
    return { success: false, error: "You must be logged in to submit" };
  }

  const supabase = await createClient();

  if (leadId) {
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, status, assigned_to, onboarding_record_id")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return { success: false, error: "Lead not found" };
    }

    const isPrimary = lead.assigned_to === current.id;
    const isAdditional =
      !isPrimary && (await listAdditionalAssigneeIds(supabase, leadId)).includes(current.id);

    if (!isPrimary && !isAdditional) {
      return { success: false, error: "This lead is not assigned to you" };
    }

    if (lead.status !== "in_progress") {
      return { success: false, error: "Lead must be in progress before onboarding" };
    }

    if (lead.onboarding_record_id) {
      return { success: false, error: "Onboarding form already submitted for this lead" };
    }
  }

  const { data: inserted, error } = await supabase
    .from("client_onboardings")
    .insert({
      ...toDbPayload(parsed.data),
      submitted_by: current.id,
      lead_id: leadId ?? null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (leadId) {
    const { error: linkError } = await supabase
      .from("leads")
      .update({
        onboarding_record_id: inserted.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (linkError) {
      return { success: false, error: linkError.message };
    }

    // Assign selected advocate as additional assignee on the lead (for notices / ownership)
    try {
      const admin = createAdminClient();
      const { data: leadRow } = await admin
        .from("leads")
        .select("assigned_to")
        .eq("id", leadId)
        .single();
      const existing = await listAdditionalAssigneeIds(admin, leadId);
      const advocateId = parsed.data.advocate_id;
      const primary = leadRow?.assigned_to as string | null;
      const next = [...new Set([...existing, advocateId])].filter((id) => id !== primary);
      await replaceAdditionalAssignees(admin, {
        leadId,
        employeeIds: next,
        assignedBy: current.id,
      });
    } catch (e) {
      console.error("[submitOnboarding] advocate assign failed", e);
    }

    await supabase.from("lead_updates").insert({
      lead_id: leadId,
      updated_by: current.id,
      note: "Client onboarding form submitted — awaiting final success mark",
      status: "in_progress",
    });
  }

  await sendAdvocateEmail(inserted as ClientOnboarding);

  redirect(leadId ? `/employee/leads/${leadId}?formSubmitted=1` : dashboardRedirect(current.role));
}

function dashboardRedirect(role: string) {
  return role === "admin" ? "/admin/dashboard?success=1" : "/employee/dashboard?success=1";
}
