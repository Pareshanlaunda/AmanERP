import Link from "next/link";

import { redirect } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { dashboardPathForRole, getUserWithRole } from "@/lib/auth/get-user";

import { createClient } from "@/lib/supabase/server";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";

import { Button } from "@/components/ui/button";



export default async function NewOnboardingPage({

  searchParams,

}: {

  searchParams: Promise<{ leadId?: string }>;

}) {

  const current = await getUserWithRole();

  if (!current) redirect("/login");



  const { leadId } = await searchParams;

  const supabase = await createClient();



  let leadDefaults: { client_name?: string; client_email?: string; client_contact_number?: string } =

    {};



  if (leadId) {

    const { data: lead } = await supabase

      .from("leads")

      .select("*")

      .eq("id", leadId)

      .single();



    if (!lead || lead.assigned_to !== current.id || lead.status !== "in_progress") {

      redirect(dashboardPathForRole(current.role));

    }



    leadDefaults = {

      client_name: lead.client_name,

      client_email: lead.client_email ?? undefined,

      client_contact_number: lead.client_phone ?? undefined,

    };

  } else if (current.role === "employee") {

    redirect("/employee/dashboard");

  }



  const backHref =

    current.role === "admin" ? "/admin/dashboard" : "/employee/dashboard";



  return (

    <div className="min-h-screen bg-background">

      <header className="erp-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">

        <div className="page-container-form py-3 sm:py-4">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">

            <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit shrink-0">

              <Link href={backHref}>

                <ArrowLeft className="h-4 w-4" />

                Back

              </Link>

            </Button>

            <div className="min-w-0">

              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">

                AMAN ERP

              </p>

              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">

                Client onboarding

              </h1>

              <p className="mt-1 text-sm text-muted-foreground">

                {leadId

                  ? "Complete the form, then mark the lead as successful."

                  : "Fill in all client details and submit."}

              </p>

            </div>

          </div>

        </div>

      </header>

      <main className="page-container-form">

        <OnboardingForm

          leadId={leadId}

          defaultAdvocateEmail={current.email}

          defaultAdvocateName={current.profile.full_name ?? ""}

          defaultClientName={leadDefaults.client_name}

          defaultClientEmail={leadDefaults.client_email}

          defaultClientPhone={leadDefaults.client_contact_number}

        />

      </main>

    </div>

  );

}

