import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { getEmployeeProfilesForAdmin } from "@/lib/actions/employees";
import { getLeadComments, hasUnreadComments } from "@/lib/actions/comments";
import { getNotifications } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadUpdate } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { AppHeader } from "@/components/shared/app-header";
import { LiveAssignLeadSection } from "@/components/admin/live-assign-lead-section";
import { LiveLeadOnboardingSection } from "@/components/shared/live-lead-onboarding-section";
import { LeadCommentsPanel } from "@/components/shared/lead-comments-panel";
import { LeadInfoFields } from "@/components/shared/lead-info-fields";
import { LiveLeadStatus } from "@/components/shared/live-lead-status";
import { LeadTimelinePanel } from "@/components/shared/lead-timeline-panel";
import { Button } from "@/components/ui/button";

async function getAuthorNames(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("profiles").select("id, full_name");
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name ?? "User"]));
}

async function getLeadOnboarding(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lead: Lead
): Promise<ClientOnboarding | null> {
  const onboardingId = lead.onboarding_record_id ?? lead.converted_onboarding_id;
  if (!onboardingId) return null;

  const { data } = await supabase
    .from("client_onboardings")
    .select("*")
    .eq("id", onboardingId)
    .single();

  return (data as ClientOnboarding) ?? null;
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await requireUserWithRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) notFound();

  const typedLead = lead as Lead;

  const [{ data: updates }, employees, notifications, comments, unread, authorNames, onboarding] =
    await Promise.all([
      supabase
        .from("lead_updates")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      getEmployeeProfilesForAdmin(),
      getNotifications(),
      getLeadComments(id),
      hasUnreadComments(id),
      getAuthorNames(supabase),
      getLeadOnboarding(supabase, typedLead),
    ]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={typedLead.client_name}
        subtitle="Lead details and assignment"
        userId={current.id}
        notifications={notifications}
        leadLinkPrefix="/admin/leads"
      />
      <main className="page-container-narrow space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <section className="erp-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/70 bg-accent/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="section-title">Lead info</h2>
            <LiveLeadStatus lead={typedLead} variant="badge" />
          </div>
          <div className="space-y-2 p-4 text-sm sm:p-6">
            <LeadInfoFields lead={typedLead} />
            {typedLead.notes && (
              <p>
                <span className="font-medium">Notes:</span> {typedLead.notes}
              </p>
            )}
            <LiveLeadStatus lead={typedLead} variant="alerts" />
          </div>
        </section>

        <LiveLeadOnboardingSection lead={typedLead} initialOnboarding={onboarding} />

        <LeadCommentsPanel
          leadId={typedLead.id}
          currentUserId={current.id}
          comments={comments}
          hasUnread={unread}
          authorNames={authorNames}
        />

        <LiveAssignLeadSection lead={typedLead} employees={employees} />

        <LeadTimelinePanel leadId={typedLead.id} initialUpdates={(updates ?? []) as LeadUpdate[]} />
      </main>
    </div>
  );
}
