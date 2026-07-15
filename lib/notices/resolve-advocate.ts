import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * Uses admin client for profile read (employees cannot SELECT other profiles under RLS).
 */
export async function resolveSigningAdvocate(
  _supabase: SupabaseClient,
  opts: {
    leadId: string | null;
    fallbackName: string;
    fallbackEmail: string | null;
  }
): Promise<ResolvedAdvocate> {
  if (opts.leadId) {
    const admin = createAdminClient();
    const { data: rows, error: rowsError } = await admin
      .from("lead_additional_assignees")
      .select("employee_id, assigned_at")
      .eq("lead_id", opts.leadId)
      .order("assigned_at", { ascending: true });

    if (rowsError) {
      console.error("[resolve-advocate] assignees failed", rowsError.message);
      throw new Error("Unable to resolve signing advocate");
    }

    const employeeIds = (rows ?? []).map((r) => r.employee_id as string);
    if (employeeIds.length > 0) {
      const { data: profiles, error: profileError } = await admin
        .from("profiles")
        .select("id, full_name, employee_type, address, mobile")
        .in("id", employeeIds)
        .eq("employee_type", "advocate");

      if (profileError) {
        console.error("[resolve-advocate] profiles failed", profileError.message);
        throw new Error("Unable to resolve signing advocate");
      }

      const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
      // First co-assignee by assigned_at who is an advocate (stable, not unsorted profiles[0]).
      for (const id of employeeIds) {
        const advocate = byId.get(id);
        if (!advocate?.full_name) continue;
        return {
          profileId: advocate.id as string,
          fullName: advocate.full_name as string,
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
