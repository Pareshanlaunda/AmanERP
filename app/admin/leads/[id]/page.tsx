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
import { AssignLeadForm } from "@/components/admin/assign-lead-form";
import { ClientOnboardingDetails } from "@/components/shared/client-onboarding-details";
import { LeadCommentsPanel } from "@/components/shared/lead-comments-panel";
import { LeadInfoFields } from "@/components/shared/lead-info-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
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
  await requireUserWithRole(["admin"]);
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
            <StatusBadge status={typedLead.status} />
          </div>
          <div className="space-y-2 p-4 text-sm sm:p-6">
            <LeadInfoFields lead={typedLead} />
            {typedLead.notes && (
              <p>
                <span className="font-medium">Notes:</span> {typedLead.notes}
              </p>
            )}
            {typedLead.status === "converted" && (
              <p className="font-medium text-green-700">This lead has been converted to a client.</p>
            )}
            {typedLead.status === "lost" && typedLead.lost_reason && (
              <div className="rounded-md bg-destructive/5 p-3 text-destructive">
                <p className="font-medium">Lost / not converted</p>
                <p className="mt-1">{typedLead.lost_reason}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Closed: {formatDate(typedLead.lost_at)}
                </p>
              </div>
            )}
          </div>
        </section>

        {onboarding ? (
          <section className="space-y-4">
            <div>
              <h2 className="section-title">Client onboarding form</h2>
              <p className="section-subtitle">
                Full details submitted by the employee during onboarding.
              </p>
            </div>
            <ClientOnboardingDetails client={onboarding} />
          </section>
        ) : (
          <section className="erp-panel overflow-hidden">
            <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
              <h2 className="section-title">Client onboarding form</h2>
            </div>
            <p className="p-4 text-sm text-muted-foreground sm:p-6">
              No onboarding form submitted yet for this lead.
            </p>
          </section>
        )}

        <LeadCommentsPanel
          leadId={typedLead.id}
          comments={comments}
          hasUnread={unread}
          authorNames={authorNames}
        />

        {typedLead.status !== "converted" && typedLead.status !== "lost" && (
          <AssignLeadForm
            leadId={typedLead.id}
            employees={employees}
            currentAssignee={typedLead.assigned_to}
          />
        )}

        <section className="erp-panel overflow-hidden">
          <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
            <h2 className="section-title">Progress timeline</h2>
          </div>
          <div className="space-y-3 p-4 sm:p-6">
            {(updates ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            ) : (
              (updates as LeadUpdate[]).map((update) => (
                <div key={update.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">{formatDate(update.created_at)}</span>
                    {update.status && <StatusBadge status={update.status} />}
                  </div>
                  <p className="mt-2">{update.note}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
