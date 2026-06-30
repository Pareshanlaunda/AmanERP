import { Suspense } from "react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import type { Lead } from "@/lib/types/database";
import { AppHeader } from "@/components/shared/app-header";
import { EmployeeDashboardContent } from "@/components/employee/employee-dashboard-content";
import { SuccessToast } from "@/components/dashboard/success-toast";

export default async function EmployeeDashboardPage() {
  const current = await requireUserWithRole(["employee"]);
  const supabase = await createClient();
  const notifications = await getNotifications();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("assigned_to", current.id)
    .neq("status", "converted")
    .neq("status", "lost")
    .order("assigned_at", { ascending: false });

  const { data: clients } = await supabase
    .from("client_onboardings")
    .select("*")
    .eq("submitted_by", current.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Employee Dashboard"
        subtitle={current.email}
        notifications={notifications}
        leadLinkPrefix="/employee/leads"
      />
      <main className="page-container space-y-6 sm:space-y-8">
        <Suspense fallback={null}>
          <SuccessToast />
        </Suspense>

        <EmployeeDashboardContent
          leads={(leads ?? []) as Lead[]}
          clients={(clients ?? []) as ClientOnboarding[]}
        />
      </main>
    </div>
  );
}
