"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sendAdvocateEmail } from "@/lib/email";
import { getUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicActionError } from "@/lib/errors/public-error";
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

  // Employees must attach to a lead (blocks orphan client_onboardings).
  if (current.role === "employee" && !leadId) {
    return { success: false, error: "Onboarding requires a lead" };
  }

  const admin = createAdminClient();
  const { data: advocateProfile, error: advocateError } = await admin
    .from("profiles")
    .select("id, role, employee_type")
    .eq("id", parsed.data.advocate_id)
    .maybeSingle();

  if (advocateError) {
    return {
      success: false,
      error: publicActionError("Unable to verify advocate", advocateError),
    };
  }
  if (
    !advocateProfile ||
    advocateProfile.role !== "employee" ||
    advocateProfile.employee_type !== "advocate"
  ) {
    return { success: false, error: "Selected advocate is invalid" };
  }

  const supabase = await createClient();
  let leadPrimary: string | null = null;
  let resolvedLeadId: string | null = null;

  if (leadId) {
    const idParsed = z.string().uuid().safeParse(leadId);
    if (!idParsed.success) {
      return { success: false, error: "Invalid lead" };
    }
    resolvedLeadId = idParsed.data;

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, status, assigned_to, onboarding_record_id")
      .eq("id", resolvedLeadId)
      .single();

    if (leadError || !lead) {
      return { success: false, error: "Lead not found" };
    }

    leadPrimary = (lead.assigned_to as string | null) ?? null;
    const isPrimary = leadPrimary === current.id;
    const isAdditional =
      !isPrimary &&
      (await listAdditionalAssigneeIds(supabase, resolvedLeadId)).includes(current.id);

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

  // RLS insert requires submitted_by = auth.uid(); reassign primary owner after if needed.
  const { data: inserted, error } = await supabase
    .from("client_onboardings")
    .insert({
      ...toDbPayload(parsed.data),
      submitted_by: current.id,
      lead_id: resolvedLeadId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Onboarding form already submitted for this lead" };
    }
    return { success: false, error: publicActionError("Unable to submit onboarding", error) };
  }

  if (resolvedLeadId && leadPrimary && leadPrimary !== current.id) {
    const { error: ownerError } = await admin
      .from("client_onboardings")
      .update({ submitted_by: leadPrimary, updated_at: new Date().toISOString() })
      .eq("id", inserted.id);
    if (ownerError) {
      await admin.from("client_onboardings").delete().eq("id", inserted.id);
      return {
        success: false,
        error: publicActionError("Unable to set primary client owner", ownerError),
      };
    }
    inserted.submitted_by = leadPrimary;
  }

  if (resolvedLeadId) {
    const { error: linkError } = await supabase
      .from("leads")
      .update({
        onboarding_record_id: inserted.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedLeadId);

    if (linkError) {
      await admin.from("client_onboardings").delete().eq("id", inserted.id);
      return {
        success: false,
        error: publicActionError("Unable to link onboarding to lead", linkError),
      };
    }

    const existing = await listAdditionalAssigneeIds(admin, resolvedLeadId);
    const next = [...new Set([...existing, parsed.data.advocate_id])].filter(
      (id) => id !== leadPrimary
    );
    const { error: assigneeError } = await replaceAdditionalAssignees(admin, {
      leadId: resolvedLeadId,
      employeeIds: next,
      assignedBy: current.id,
    });
    if (assigneeError) {
      console.error("[submitOnboarding] advocate assign failed", assigneeError);
    }

    const { error: updateTrailError } = await supabase.from("lead_updates").insert({
      lead_id: resolvedLeadId,
      updated_by: current.id,
      note: assigneeError
        ? "Client onboarding form submitted — advocate assign failed (fix assignees manually)"
        : "Client onboarding form submitted — awaiting final success mark",
      status: "in_progress",
    });
    if (updateTrailError) {
      console.error("[submitOnboarding] lead_updates insert failed", updateTrailError.message);
    }

    await sendAdvocateEmail(inserted as ClientOnboarding);

    const qs = new URLSearchParams({ formSubmitted: "1" });
    if (assigneeError) qs.set("advocateAssignFailed", "1");
    if (updateTrailError) qs.set("auditTrailFailed", "1");
    const leadPath =
      current.role === "admin"
        ? `/admin/leads/${resolvedLeadId}?${qs}`
        : `/employee/leads/${resolvedLeadId}?${qs}`;
    redirect(leadPath);
  }

  await sendAdvocateEmail(inserted as ClientOnboarding);

  redirect(dashboardRedirect(current.role));
}

function dashboardRedirect(role: string) {
  return role === "admin" ? "/admin/dashboard?success=1" : "/employee/dashboard?success=1";
}
