import { Suspense } from "react";
import { after } from "next/server";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeesOverview } from "@/lib/actions/employees";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/shared/app-header";
import { DashboardRecentLeads } from "@/components/admin/dashboard-recent-leads";
import { RealtimeEmployeesOverview } from "@/components/admin/realtime-employees-overview";
import { SuccessToast } from "@/components/dashboard/success-toast";
import { fetchAdminLeadsPage } from "@/lib/leads/fetch-admin-leads-page";
import {
  BOTBIZ_BACKGROUND_SYNC_LIMIT,
  DASHBOARD_LEADS_PAGE_SIZE,
} from "@/lib/leads/dashboard-limits";

export default async function AdminDashboardPage() {
  const current = await requireUserWithRole(["admin"]);
  const supabase = await createClient();

  after(() => {
    void import("@/lib/botbiz/sync-subscribers").then(({ syncRecentWhatsAppLeadsFromBotbiz }) =>
      syncRecentWhatsAppLeadsFromBotbiz({ limit: BOTBIZ_BACKGROUND_SYNC_LIMIT }).catch((err) => {
        console.error("[admin-dashboard] background Botbiz sync failed", err);
      })
    );
  });

  const [notifications, employeeStats, leadsPage, totalAllResult] = await Promise.all([
    getNotifications(),
    getEmployeesOverview(),
    fetchAdminLeadsPage(supabase, {
      page: 1,
      pageSize: DASHBOARD_LEADS_PAGE_SIZE,
      queue: "inbox",
    }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
  ]);

  if (totalAllResult.error) {
    console.error("[admin-dashboard] lead count failed", totalAllResult.error.message);
    throw new Error("Unable to load lead count");
  }

  const totalLeadCount = totalAllResult.count ?? leadsPage.totalCount;

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
          initialLeads={leadsPage.leads}
          employees={employeeStats}
          totalLeadCount={totalLeadCount}
          initialInboxCount={leadsPage.totalCount}
          pageSize={DASHBOARD_LEADS_PAGE_SIZE}
        />

        <RealtimeEmployeesOverview initialEmployees={employeeStats} />
      </main>
    </div>
  );
}
