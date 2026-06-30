import { Suspense } from "react";
import { Plus } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeesOverview } from "@/lib/actions/employees";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile } from "@/lib/types/database";
import { AppHeader, HeaderLink } from "@/components/shared/app-header";
import { LeadsTable } from "@/components/admin/leads-table";
import { EmployeesOverview } from "@/components/admin/employees-overview";
import { SuccessToast } from "@/components/dashboard/success-toast";

export default async function AdminDashboardPage() {
  await requireUserWithRole(["admin"]);
  const supabase = await createClient();
  const current = await requireUserWithRole(["admin"]);
  const [notifications, employeeStats] = await Promise.all([
    getNotifications(),
    getEmployeesOverview(),
  ]);

  const employees = employeeStats.map(({ id, full_name, role, created_at, email }) => ({
    id,
    full_name,
    role,
    created_at,
    email,
  }));

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Admin Dashboard"
        subtitle={current.email}
        notifications={notifications}
        leadLinkPrefix="/admin/leads"
      />
      <main className="page-container space-y-6 sm:space-y-8">
        <Suspense fallback={null}>
          <SuccessToast />
        </Suspense>

        <section className="erp-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/70 bg-accent/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="section-title">Recent leads</h2>
            <HeaderLink href="/admin/leads/new">
              <Plus className="h-4 w-4" />
              New lead
            </HeaderLink>
          </div>
          <div className="p-4 sm:p-6">
            <LeadsTable
              leads={(leads ?? []) as Lead[]}
              employees={employees as Profile[]}
            />
          </div>
        </section>

        <EmployeesOverview employees={employeeStats} />
      </main>
    </div>
  );
}
