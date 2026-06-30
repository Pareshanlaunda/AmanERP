"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { markLeadInProgress, markLeadSuccessful } from "@/lib/actions/leads";
import { RejectLeadForm } from "@/components/employee/reject-lead-form";
import type { Lead, LeadComment, LeadUpdate } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { LeadInfoFields } from "@/components/shared/lead-info-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { CidBadge } from "@/components/shared/cid-badge";
import { LeadCommentsPanel } from "@/components/shared/lead-comments-panel";
import { LeadTimelinePanel } from "@/components/shared/lead-timeline-panel";
import { useRealtimeLead } from "@/lib/hooks/use-realtime-lead";
import { useRealtimeRecord } from "@/lib/hooks/use-realtime-record";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type LeadDetailPanelProps = {
  currentUserId: string;
  lead: Lead;
  updates: LeadUpdate[];
  comments: LeadComment[];
  hasUnreadComments: boolean;
  authorNames: Record<string, string>;
  clientId?: string | null;
};



export function LeadDetailPanel({
  currentUserId,
  lead: initialLead,
  updates,
  comments,
  hasUnreadComments,
  authorNames,
  clientId,
}: LeadDetailPanelProps) {
  const lead = useRealtimeLead(initialLead);
  const initialOnboardingRecord =
    initialLead.onboarding_record_id && clientId
      ? ({ id: initialLead.onboarding_record_id, client_id: clientId } as ClientOnboarding)
      : null;
  const liveOnboarding = useRealtimeRecord({
    table: "client_onboardings",
    recordId: lead.onboarding_record_id,
    initialRecord: initialOnboardingRecord,
    channelName: `employee-lead-onboarding:${lead.id}`,
  });
  const liveClientId = liveOnboarding?.client_id ?? clientId;
  const [isPending, startTransition] = useTransition();

  function handleStartProgress() {
    startTransition(async () => {
      const result = await markLeadInProgress(lead.id);
      if (!result.success) toast.error(result.error);
      else toast.success("Lead is now in progress");
    });
  }

  function handleMarkSuccessful() {
    startTransition(async () => {
      const result = await markLeadSuccessful(lead.id);
      if (!result.success) toast.error(result.error);
      else toast.success("Lead marked successful — admin has been notified");
    });
  }



  return (

    <div className="space-y-6">

      <section className="erp-panel overflow-hidden">

        <div className="flex flex-col gap-3 border-b border-border/70 bg-accent/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <h2 className="section-title">{lead.client_name}</h2>

          <StatusBadge status={lead.status} />

        </div>

        <div className="space-y-2 p-4 text-sm sm:p-6">

          {liveClientId && (

            <div className="flex flex-wrap items-center gap-2">

              <span className="font-medium">Client ID</span>

              <CidBadge clientId={liveClientId} />

            </div>

          )}

          <LeadInfoFields lead={lead} />

          {lead.notes && (

            <p>

              <span className="font-medium">Notes:</span> {lead.notes}

            </p>

          )}

          {lead.assignment_comment && (

            <div className="rounded-md bg-muted p-3">

              <p className="font-medium">Admin assignment comment</p>

              <p className="mt-1 text-muted-foreground">{lead.assignment_comment}</p>

            </div>

          )}

        </div>

      </section>



      <LeadCommentsPanel
        leadId={lead.id}
        currentUserId={currentUserId}
        comments={comments}
        hasUnread={hasUnreadComments}
        authorNames={authorNames}
      />



      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">

        {lead.status === "assigned" && (

          <Button onClick={handleStartProgress} disabled={isPending} className="w-full sm:w-auto">

            Start progress

          </Button>

        )}

        {lead.status === "in_progress" && !lead.onboarding_record_id && (

          <Button asChild className="w-full sm:w-auto">

            <Link href={`/onboarding/new?leadId=${lead.id}`}>Onboard client</Link>

          </Button>

        )}

        {lead.status === "in_progress" && lead.onboarding_record_id && (

          <Button onClick={handleMarkSuccessful} disabled={isPending} className="w-full sm:w-auto">

            Mark as successful

          </Button>

        )}

      </div>



      {["assigned", "in_progress"].includes(lead.status) && (

        <RejectLeadForm leadId={lead.id} clientName={lead.client_name} />

      )}



      {lead.status === "lost" && lead.lost_reason && (

        <section className="erp-panel overflow-hidden border-destructive/20 bg-destructive/5">

          <div className="border-b border-destructive/10 px-4 py-4 sm:px-6">

            <h2 className="section-title text-destructive">Lost / not converted</h2>

          </div>

          <div className="space-y-2 p-4 text-sm text-muted-foreground sm:p-6">

            <p>{lead.lost_reason}</p>

            <p>Closed: {formatDate(lead.lost_at)}</p>

          </div>

        </section>

      )}



      <LeadTimelinePanel leadId={lead.id} initialUpdates={updates} />
    </div>
  );
}

