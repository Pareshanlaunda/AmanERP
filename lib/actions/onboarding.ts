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

    if (lead.assigned_to !== current.id) {
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
