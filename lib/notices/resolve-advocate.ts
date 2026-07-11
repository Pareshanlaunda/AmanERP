import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedAdvocate = {
  profileId: string | null;
  fullName: string;
  email: string | null;
  address: string | null;
  mobile: string | null;
  source: "additional_assignee" | "onboarding_fallback";
};

/**
 * Prefer first additional assignee with employee_type = advocate on the client's lead.
 * Fall back to onboarding advocate_name / advocate_email.
 * Profile address/mobile feed the letterhead (our advocate).
 * Reply Notice "Copy To Advocate" is the lender's advocate — form-only, separate.
 */
export async function resolveSigningAdvocate(
  supabase: SupabaseClient,
  opts: {
    leadId: string | null;
    fallbackName: string;
    fallbackEmail: string | null;
  }
): Promise<ResolvedAdvocate> {
  if (opts.leadId) {
    const { data: rows } = await supabase
      .from("lead_additional_assignees")
      .select("employee_id")
      .eq("lead_id", opts.leadId);

    const employeeIds = (rows ?? []).map((r) => r.employee_id as string);
    if (employeeIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, employee_type, address, mobile")
        .in("id", employeeIds)
        .eq("employee_type", "advocate");

      const advocate = profiles?.[0];
      if (advocate?.full_name) {
        return {
          profileId: advocate.id,
          fullName: advocate.full_name,
          email: opts.fallbackEmail,
          address: (advocate.address as string | null) ?? null,
          mobile: (advocate.mobile as string | null) ?? null,
          source: "additional_assignee",
        };
      }
    }
  }

  return {
    profileId: null,
    fullName: opts.fallbackName,
    email: opts.fallbackEmail,
    address: null,
    mobile: null,
    source: "onboarding_fallback",
  };
}
