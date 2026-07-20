import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { listAdminClientsPage } from "@/lib/actions/clients";
import { getNotifications } from "@/lib/actions/notifications";
import { ADMIN_CLIENTS_PAGE_SIZE } from "@/lib/clients/dashboard-limits";
import { AppHeader } from "@/components/shared/app-header";
import { AdminClientsPanel } from "@/components/admin/admin-clients-panel";
import { Button } from "@/components/ui/button";

export default async function AdminClientsPage() {
  const current = await requireUserWithRole(["admin"]);
  const [notifications, pageResult] = await Promise.all([
    getNotifications(),
    listAdminClientsPage({ page: 1, pageSize: ADMIN_CLIENTS_PAGE_SIZE }),
  ]);

  if (!pageResult.success) {
    throw new Error(pageResult.error);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="All clients"
        subtitle={current.email}
        userId={current.id}
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
            <h2 className="section-title">Client registry</h2>
            <p className="section-subtitle">
              {pageResult.totalCount.toLocaleString()} onboarded client
              {pageResult.totalCount === 1 ? "" : "s"} · search and page on the server
            </p>
          </div>
          <div className="p-4 sm:p-6">
            <AdminClientsPanel
              initialClients={pageResult.clients}
              initialTotalCount={pageResult.totalCount}
              initialOwnerNames={pageResult.ownerNames}
              initialNoticeIds={pageResult.latestNoticeIds}
              pageSize={ADMIN_CLIENTS_PAGE_SIZE}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
