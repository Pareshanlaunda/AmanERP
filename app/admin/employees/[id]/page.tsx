import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeeDetail } from "@/lib/actions/employees";
import { getNotifications } from "@/lib/actions/notifications";
import { AppHeader } from "@/components/shared/app-header";
import { RealtimeEmployeeDetailSections } from "@/components/admin/realtime-employee-detail-sections";
import { Button } from "@/components/ui/button";

export default async function AdminEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["admin"]);
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
        subtitle={[employee.employee_code, employee.email].filter(Boolean).join(" · ") || "Employee details"}
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

        <RealtimeEmployeeDetailSections employeeId={id} initial={employee} />
      </main>
    </div>
  );
}
