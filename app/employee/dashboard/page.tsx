import { Suspense } from "react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import type { Lead } from "@/lib/types/database";
import { AppHeader } from "@/components/shared/app-header";
import { EmployeeDashboardContent } from "@/components/employee/employee-dashboard-content";
import { SuccessToast } from "@/components/dashboard/success-toast";
import { listAdditionalAssigneeIdsForLeads } from "@/lib/leads/assignees";
import { attachLeadSourcesToClients } from "@/lib/leads/attach-lead-sources";

const LEAD_SELECT =
  "id, client_name, client_phone, client_alternate_phone, client_email, notes, status, source, preferred_language, assigned_at, assigned_to, onboarding_record_id";

export default async function EmployeeDashboardPage() {
  const current = await requireUserWithRole(["employee"]);
  const supabase = await createClient();

  const [notifications, primaryResult, additionalLinks, clientsResult] = await Promise.all([
    getNotifications(),
    supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("assigned_to", current.id)
      .neq("status", "converted")
      .neq("status", "lost")
      .neq("status", "successful")
      .order("assigned_at", { ascending: false })
      .limit(500),
    supabase
      .from("lead_additional_assignees")
      .select("lead_id")
      .eq("employee_id", current.id),
    supabase
      .from("client_onboardings")
      .select(
        "id, client_id, client_name, client_email, client_contact_number, loan_amount, advocate_name, created_at, submitted_by, lead_id"
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (primaryResult.error || additionalLinks.error || clientsResult.error) {
    console.error("[employee-dashboard] load failed", {
      primary: primaryResult.error?.message,
      additional: additionalLinks.error?.message,
      clients: clientsResult.error?.message,
    });
    throw new Error("Unable to load dashboard. Refresh and try again.");
  }

  const clients = await attachLeadSourcesToClients(
    supabase,
    (clientsResult.data ?? []) as ClientOnboarding[]
  );
  const clientIds = clients.map((c) => c.id);
  const noticeMap: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: notices, error: noticesError } = await supabase
      .from("client_notices")
      .select("id, client_onboarding_id, created_at")
      .in("client_onboarding_id", clientIds)
      .order("created_at", { ascending: false });
    if (noticesError) {
      console.error("[employee-dashboard] notices failed", noticesError.message);
      throw new Error("Unable to load dashboard. Refresh and try again.");
    }
    for (const row of notices ?? []) {
      const cid = row.client_onboarding_id as string;
      if (!noticeMap[cid]) noticeMap[cid] = row.id as string;
    }
  }

  const primaryLeads = (primaryResult.data ?? []) as Lead[];
  const additionalLeadIds = (additionalLinks.data ?? [])
    .map((row) => row.lead_id as string)
    .filter((id) => !primaryLeads.some((l) => l.id === id));

  let additionalLeads: Lead[] = [];
  if (additionalLeadIds.length > 0) {
    const { data, error: extraError } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .in("id", additionalLeadIds)
      .neq("status", "converted")
      .neq("status", "lost")
      .neq("status", "successful")
      .order("assigned_at", { ascending: false });
    if (extraError) {
      console.error("[employee-dashboard] additional leads fetch failed", extraError.message);
      throw new Error("Unable to load dashboard. Refresh and try again.");
    }
    additionalLeads = (data ?? []) as Lead[];
  }

  const merged = [...primaryLeads, ...additionalLeads];
  const assigneeMap = await listAdditionalAssigneeIdsForLeads(
    supabase,
    merged.map((l) => l.id)
  );
  const leads = merged
    .map((lead) => ({
      ...lead,
      additional_assignee_ids: assigneeMap.get(lead.id) ?? [],
    }))
    .sort((a, b) => {
      const aAt = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
      const bAt = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
      return bAt - aAt;
    });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Employee Dashboard"
        subtitle={current.email}
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/employee/leads"
      />
      <main className="page-container space-y-6 sm:space-y-8">
        <Suspense fallback={null}>
          <SuccessToast />
        </Suspense>

        <EmployeeDashboardContent
          userId={current.id}
          leads={leads}
          clients={clients}
          latestNoticeIds={noticeMap}
        />
      </main>
    </div>
  );
}
