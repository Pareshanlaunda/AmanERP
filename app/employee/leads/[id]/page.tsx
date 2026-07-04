import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getLeadComments, hasUnreadComments } from "@/lib/actions/comments";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadUpdate } from "@/lib/types/database";
import { AppHeader } from "@/components/shared/app-header";
import { EmployeeLeadDetailLive } from "@/components/employee/employee-lead-detail-live";
import { Button } from "@/components/ui/button";
import { getAuthorNamesFromComments } from "@/lib/queries/profiles";

export default async function EmployeeLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["employee"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("assigned_to", current.id)
    .single();

  if (!lead) notFound();

  const typedLead = lead as Lead;

  const [updatesResult, comments, unread, authorNames, notifications, onboardingResult] =
    await Promise.all([
      supabase
        .from("lead_updates")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      getLeadComments(id),
      hasUnreadComments(id),
      getAuthorNamesFromComments(id, supabase),
      getNotifications(),
      typedLead.onboarding_record_id
        ? supabase
            .from("client_onboardings")
            .select("client_id")
            .eq("id", typedLead.onboarding_record_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

  const clientId = onboardingResult.data?.client_id ?? null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={typedLead.client_name}
        subtitle="Lead progress and onboarding"
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/employee/leads"
      />
      <main className="page-container-narrow">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 sm:mb-6">
          <Link href="/employee/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <EmployeeLeadDetailLive
          currentUserId={current.id}
          lead={typedLead}
          updates={(updatesResult.data ?? []) as LeadUpdate[]}
          comments={comments}
          hasUnreadComments={unread}
          authorNames={authorNames}
          clientId={clientId}
        />
      </main>
    </div>
  );
}
