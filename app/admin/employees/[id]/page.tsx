import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeeDetail } from "@/lib/actions/employees";
import { getNotifications } from "@/lib/actions/notifications";
import { AppHeader } from "@/components/shared/app-header";
import { LeadsTable } from "@/components/admin/leads-table";
import { LostLeadsTable } from "@/components/admin/lost-leads-table";
import { ClientsTable } from "@/components/dashboard/clients-table";
import { Button } from "@/components/ui/button";

export default async function AdminEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserWithRole(["admin"]);
  const { id } = await params;
  const [employee, notifications] = await Promise.all([
    getEmployeeDetail(id),
    getNotifications(),
  ]);

  if (!employee) notFound();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={employee.full_name ?? "Employee"}
        subtitle={employee.email ?? "Employee details"}
        notifications={notifications}
        leadLinkPrefix="/admin/leads"
      />
      <main className="page-container space-y-6 sm:space-y-8">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <section className="erp-panel overflow-hidden">
          <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
            <h2 className="section-title">Summary</h2>
          </div>
          <div className="grid gap-4 p-4 text-sm sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
            <div>
              <div className="text-muted-foreground">Email</div>
              <div className="font-medium">{employee.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Active leads</div>
              <div className="font-medium">
                <span className="stat-pill">{employee.activeLeads.length}</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Lost / not converted</div>
              <div className="font-medium">
                <span className="stat-pill">{employee.lostLeads.length}</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Onboarded clients</div>
              <div className="font-medium">
                <span className="stat-pill">{employee.total_clients}</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Converted</div>
              <div className="font-medium">
                <span className="stat-pill">{employee.converted_count}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="erp-panel overflow-hidden">
          <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
            <h2 className="section-title">Active leads</h2>
            <p className="section-subtitle">Currently assigned or in progress.</p>
          </div>
          <div className="p-4 sm:p-6">
            <LeadsTable leads={employee.activeLeads} employees={[]} hideAssignedColumn />
          </div>
        </section>

        <section className="erp-panel overflow-hidden">
          <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
            <h2 className="section-title">Onboarded clients</h2>
            <p className="section-subtitle">Clients with assigned CID numbers.</p>
          </div>
          <div className="p-4 sm:p-6">
            <ClientsTable
              clients={employee.clients}
              showClientId
              showSearch
              viewLinkPrefix="/admin/clients"
            />
          </div>
        </section>

        <section className="erp-panel overflow-hidden">
          <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
            <h2 className="section-title">Lost / not converted</h2>
            <p className="section-subtitle">Closed without conversion, including rejection reasons.</p>
          </div>
          <div className="p-4 sm:p-6">
            <LostLeadsTable leads={employee.lostLeads} />
          </div>
        </section>
      </main>
    </div>
  );
}
