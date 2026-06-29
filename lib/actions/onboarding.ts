"use server";

import { redirect } from "next/navigation";
import { sendAdvocateEmail } from "@/lib/email";
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
  data: OnboardingFormValues
): Promise<SubmitOnboardingResult> {
  const parsed = onboardingFormSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid form data" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to submit" };
  }

  const { data: inserted, error } = await supabase
    .from("client_onboardings")
    .insert({
      ...toDbPayload(parsed.data),
      submitted_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await sendAdvocateEmail(inserted as ClientOnboarding);

  redirect("/dashboard?success=1");
}
