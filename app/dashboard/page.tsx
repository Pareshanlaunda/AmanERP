import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ClientsTable } from "@/components/dashboard/clients-table";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { SuccessToast } from "@/components/dashboard/success-toast";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: clients, error } = await supabase
    .from("client_onboardings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch clients:", error.message);
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userEmail={user?.email ?? ""} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Suspense fallback={null}>
          <SuccessToast />
        </Suspense>
        <ClientsTable clients={(clients ?? []) as ClientOnboarding[]} />
      </main>
    </div>
  );
}
