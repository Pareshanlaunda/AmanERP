import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAuthorNamesForIds(
  authorIds: string[]
): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(authorIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  // Admin client: employees can only SELECT own profile under RLS; comments need coworker names.
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, full_name").in("id", uniqueIds);

  return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name ?? "User"]));
}

export async function getAuthorNamesFromComments(
  leadId: string,
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<Record<string, string>> {
  const client = supabase ?? (await createClient());
  const { data: comments } = await client
    .from("lead_comments")
    .select("author_id")
    .eq("lead_id", leadId);

  const authorIds = (comments ?? []).map((c) => c.author_id);
  return getAuthorNamesForIds(authorIds);
}

export async function getEmployeeProfilesFromDb(): Promise<
  {
    id: string;
    employee_code: string | null;
    full_name: string | null;
    role: string;
    employee_type: string | null;
    address: string | null;
    mobile: string | null;
    created_at: string;
  }[]
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, employee_code, full_name, role, employee_type, address, mobile, created_at")
    .eq("role", "employee")
    .order("full_name", { ascending: true });

  return data ?? [];
}
