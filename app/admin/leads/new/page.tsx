import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeeProfilesForAdmin } from "@/lib/actions/employees";
import { getNotifications } from "@/lib/actions/notifications";
import { AppHeader } from "@/components/shared/app-header";
import { CreateLeadForm } from "@/components/admin/create-lead-form";
import { Button } from "@/components/ui/button";

export default async function NewLeadPage() {
  const current = await requireUserWithRole(["admin"]);
  const [notifications, employees] = await Promise.all([
    getNotifications(),
    getEmployeeProfilesForAdmin(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Create Lead"
        subtitle="Manual test lead (WhatsApp-ready later)"
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/admin/leads"
      />
      <main className="page-container-narrow">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 sm:mb-6">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <CreateLeadForm employees={employees} />
      </main>
    </div>
  );
}
