import { Suspense } from "react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeesOverview } from "@/lib/actions/employees";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile } from "@/lib/types/database";
import { AppHeader } from "@/components/shared/app-header";
import { DashboardRecentLeads } from "@/components/admin/dashboard-recent-leads";
import { RealtimeEmployeesOverview } from "@/components/admin/realtime-employees-overview";
import { SuccessToast } from "@/components/dashboard/success-toast";

export default async function AdminDashboardPage() {
  const current = await requireUserWithRole(["admin"]);
  const supabase = await createClient();
  const [notifications, employeeStats, leadsResult] = await Promise.all([
    getNotifications(),
    getEmployeesOverview(),
    supabase
      .from("leads")
      .select(
        "id, client_name, client_phone, source, status, assigned_to, created_at, assigned_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const leads = leadsResult.data;

  const employees = employeeStats.map(({ id, full_name, role, employee_type, created_at, email }) => ({
    id,
    full_name,
    role,
    employee_type,
    created_at,
    email,
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
          initialLeads={(leads ?? []) as Lead[]}
          employees={employees as Profile[]}
        />

        <RealtimeEmployeesOverview initialEmployees={employeeStats} />
      </main>
    </div>
  );
}
