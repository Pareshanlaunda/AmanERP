import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { dashboardPathForRole, getUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types/database";
import {
  buildOnboardingDefaultsFromLead,
} from "@/lib/leads/whatsapp-to-onboarding-defaults";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { listAdvocateEmployees } from "@/lib/actions/advocates";
import { BRAND_SHORT } from "@/lib/brand";

export default async function NewOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const current = await getUserWithRole();
  if (!current) redirect("/");

  const { leadId } = await searchParams;
  const supabase = await createClient();

  let lead: Lead | null = null;

  if (leadId) {
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).single();
    lead = data as Lead | null;

    if (!lead || lead.assigned_to !== current.id || lead.status !== "in_progress") {
      redirect(dashboardPathForRole(current.role));
    }
  } else if (current.role === "employee") {
    redirect("/employee/dashboard");
  }

  const whatsappDefaults = lead ? buildOnboardingDefaultsFromLead(lead) : null;
  const advocates = await listAdvocateEmployees();

  const backHref = current.role === "admin" ? "/admin/dashboard" : "/employee/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <header className="erp-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="page-container-form py-3 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit shrink-0">
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
                  {BRAND_SHORT}
                </p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Client onboarding
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {leadId
                    ? "Details from the lead are prefilled — review, update if needed, then submit."
                    : "Fill in all client details and submit."}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="page-container-form">
        <OnboardingForm
          leadId={leadId}
          advocates={advocates}
          defaultClientName={whatsappDefaults?.formDefaults.client_name ?? lead?.client_name ?? ""}
          defaultClientEmail={whatsappDefaults?.formDefaults.client_email ?? lead?.client_email ?? ""}
          defaultClientPhone={
            whatsappDefaults?.formDefaults.client_contact_number ?? lead?.client_phone ?? ""
          }
          defaultLoanType={whatsappDefaults?.formDefaults.loan_type ?? lead?.loan_type ?? undefined}
          defaultHarassmentAnswer={whatsappDefaults?.formDefaults.harassment_answer}
          defaultHarassmentType={whatsappDefaults?.formDefaults.harassment_type}
          whatsappPersonalLoanRange={whatsappDefaults?.whatsappRanges.personalLoan ?? null}
        />
      </main>
    </div>
  );
}
