import { Suspense } from "react";
import { after } from "next/server";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeesOverview } from "@/lib/actions/employees";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types/database";
import { AppHeader } from "@/components/shared/app-header";
import { DashboardRecentLeads } from "@/components/admin/dashboard-recent-leads";
import { RealtimeEmployeesOverview } from "@/components/admin/realtime-employees-overview";
import { SuccessToast } from "@/components/dashboard/success-toast";
import { listAdditionalAssigneeIdsForLeads } from "@/lib/leads/assignees";

export default async function AdminDashboardPage() {
  const current = await requireUserWithRole(["admin"]);
  const supabase = await createClient();

  // Do not block first paint / post-login navigate on Hostinger.
  // Botbiz pull of ~40 subscribers can take many seconds; run after response.
  after(() => {
    void import("@/lib/botbiz/sync-subscribers").then(({ syncRecentWhatsAppLeadsFromBotbiz }) =>
      syncRecentWhatsAppLeadsFromBotbiz({ limit: 40 }).catch((err) => {
        console.error("[admin-dashboard] background Botbiz sync failed", err);
      })
    );
  });

  const [notifications, employeeStats, leadsResult] = await Promise.all([
    getNotifications(),
    getEmployeesOverview(),
    supabase
      .from("leads")
      .select(
        "id, client_name, client_phone, source, status, preferred_language, assigned_to, created_at, assigned_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (leadsResult.error) {
    console.error("[admin-dashboard] recent leads failed", leadsResult.error.message);
    throw new Error("Unable to load recent leads");
  }
  const rawLeads = (leadsResult.data ?? []) as Lead[];
  const assigneeMap = await listAdditionalAssigneeIdsForLeads(
    supabase,
    rawLeads.map((l) => l.id)
  );
  const leads = rawLeads.map((lead) => ({
    ...lead,
    additional_assignee_ids: assigneeMap.get(lead.id) ?? [],
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Admin Dashboard"
        subtitle={current.email}
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/admin/leads"
      />
      <main className="page-container space-y-6 sm:space-y-8">
        <Suspense fallback={null}>
          <SuccessToast />
        </Suspense>

        <DashboardRecentLeads
          initialLeads={leads}
          employees={employeeStats}
        />

        <RealtimeEmployeesOverview initialEmployees={employeeStats} />
      </main>
    </div>
  );
}
