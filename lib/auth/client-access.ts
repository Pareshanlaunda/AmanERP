import type { createClient } from "@/lib/supabase/server";

export type ClientAccessRow = {
  id: string;
  client_name: string;
  client_id: string | null;
  client_contact_number: string | null;
  client_email: string | null;
  loan_amount: number | null;
  previous_monthly_emi: number | null;
  loan_type: string | null;
  advocate_name: string | null;
  advocate_email: string | null;
  lead_id: string | null;
  submitted_by: string | null;
};

const CLIENT_ACCESS_SELECT =
  "id, client_name, client_id, client_contact_number, client_email, loan_amount, previous_monthly_emi, loan_type, advocate_name, advocate_email, lead_id, submitted_by";

/**
 * Admin: any client. Employee: submitter or lead assignee (primary/additional).
 * Relies on RLS for SELECT; then double-checks assignee path when RLS returns the row.
 */
export async function assertClientAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  userId: string,
  role: string
): Promise<{ ok: true; client: ClientAccessRow } | { ok: false; error: string }> {
  const { data: client, error } = await supabase
    .from("client_onboardings")
    .select(CLIENT_ACCESS_SELECT)
    .eq("id", clientId)
    .maybeSingle();

  if (error || !client) {
    return { ok: false, error: "Client not found" };
  }

  const row = client as ClientAccessRow;

  if (role === "admin") {
    return { ok: true, client: row };
  }

  if (row.submitted_by === userId) {
    return { ok: true, client: row };
  }

  if (row.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("assigned_to")
      .eq("id", row.lead_id)
      .maybeSingle();

    const { data: extra } = await supabase
      .from("lead_additional_assignees")
      .select("employee_id")
      .eq("lead_id", row.lead_id)
      .eq("employee_id", userId)
      .maybeSingle();

    if (lead?.assigned_to === userId || extra) {
      return { ok: true, client: row };
    }
  }

  return { ok: false, error: "You do not have access to this client" };
}
