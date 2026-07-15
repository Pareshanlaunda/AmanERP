import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getLeadComments, hasUnreadComments } from "@/lib/actions/comments";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadUpdate } from "@/lib/types/database";
import { AppHeader } from "@/components/shared/app-header";
import { EmployeeLeadDetailLive } from "@/components/employee/employee-lead-detail-live";
import { SuccessToast } from "@/components/dashboard/success-toast";
import { Button } from "@/components/ui/button";
import { getAuthorNamesFromComments } from "@/lib/queries/profiles";
import { listAdditionalAssigneeIds } from "@/lib/leads/assignees";

export default async function EmployeeLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["employee"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();

  if (!lead) notFound();

  const typedLead = lead as Lead;
  const additionalIds = await listAdditionalAssigneeIds(supabase, id);
  typedLead.additional_assignee_ids = additionalIds;

  const isPrimary = typedLead.assigned_to === current.id;
  const isAdditional = additionalIds.includes(current.id);
  if (!isPrimary && !isAdditional) notFound();

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
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (updatesResult.error) {
    console.error("[employee-lead] updates failed", updatesResult.error.message);
    throw new Error("Unable to load lead timeline");
  }
  if (onboardingResult.error) {
    console.error("[employee-lead] onboarding failed", onboardingResult.error.message);
    throw new Error("Unable to load onboarding link");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={typedLead.client_name}
        subtitle="Assigned lead"
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/employee/leads"
      />
      <main className="page-container-narrow space-y-6">
        <Suspense fallback={null}>
          <SuccessToast />
        </Suspense>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/employee/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <EmployeeLeadDetailLive
          lead={typedLead}
          currentUserId={current.id}
          comments={comments}
          hasUnreadComments={unread}
          authorNames={authorNames}
          updates={(updatesResult.data ?? []) as LeadUpdate[]}
          clientId={onboardingResult.data?.client_id ?? null}
        />
      </main>
    </div>
  );
}
