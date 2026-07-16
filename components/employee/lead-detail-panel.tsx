"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { markLeadInProgress } from "@/lib/actions/leads";
import { LeadOutcomeForm } from "@/components/employee/lead-outcome-form";
import type { Lead, LeadComment, LeadUpdate } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { LeadInfoFields } from "@/components/shared/lead-info-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { ClidBadge } from "@/components/shared/clid-badge";
import { LeadCommentsPanel } from "@/components/shared/lead-comments-panel";
import { LeadTimelinePanel } from "@/components/shared/lead-timeline-panel";
import { useLeadLive } from "@/components/shared/lead-live-provider";
import { WhatsAppChatPanel } from "@/components/shared/whatsapp-chat-panel";
import { PageTabs } from "@/components/shared/page-tabs";
import { useRealtimeRecord } from "@/lib/hooks/use-realtime-record";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";

type LeadDetailPanelProps = {
  currentUserId: string;
  lead: Lead;
  updates: LeadUpdate[];
  comments: LeadComment[];
  hasUnreadComments: boolean;
  authorNames: Record<string, string>;
  clientId?: string | null;
};

function EmployeeLeadDetailsTab({
  liveClientId,
  isPending,
  onStartProgress,
}: {
  liveClientId?: string | null;
  isPending: boolean;
  onStartProgress: () => void;
}) {
  const { lead } = useLeadLive();

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
              <span className="font-medium">CLID</span>
              <ClidBadge clientId={liveClientId} />
            </div>
          )}
          <LeadInfoFields lead={lead} />
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {lead.status === "assigned" && (
          <Button onClick={onStartProgress} disabled={isPending} className="w-full sm:w-auto">
            Start progress
          </Button>
        )}
        {lead.status === "in_progress" && !lead.onboarding_record_id && (
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/onboarding/new?leadId=${lead.id}`}>
              {lead.source === "whatsapp" ? "Add call details" : "Onboard client"}
            </Link>
          </Button>
        )}
      </div>

      {["assigned", "in_progress"].includes(lead.status) && (
        <LeadOutcomeForm
          leadId={lead.id}
          clientName={lead.client_name}
          canMarkSuccessful={lead.status === "in_progress" && !!lead.onboarding_record_id}
        />
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
    </div>
  );
}

export function LeadDetailPanel({
  currentUserId,
  updates,
  comments,
  hasUnreadComments,
  authorNames,
  clientId,
}: Omit<LeadDetailPanelProps, "lead">) {
  const { lead, setLeadOptimistic } = useLeadLive();
  const initialOnboardingRecord = useMemo(
    () =>
      lead.onboarding_record_id && clientId
        ? ({ id: lead.onboarding_record_id, client_id: clientId } as ClientOnboarding)
        : null,
    [lead.onboarding_record_id, clientId]
  );
  const liveOnboarding = useRealtimeRecord({
    table: "client_onboardings",
    recordId: lead.onboarding_record_id,
    initialRecord: initialOnboardingRecord,
    channelName: `employee-lead-onboarding:${lead.id}`,
  });
  const liveClientId = liveOnboarding?.client_id ?? clientId;
  const [isPending, startTransition] = useTransition();
  const showWhatsApp = lead.source === "whatsapp";

  function handleStartProgress() {
    startTransition(async () => {
      setLeadOptimistic({ status: "in_progress" });
      const result = await markLeadInProgress(lead.id);
      if (!result.success) {
        setLeadOptimistic({ status: "assigned" });
        toast.error(result.error);
      } else {
        toast.success("Lead is now in progress");
      }
    });
  }

  return (
    <PageTabs
      tabs={[
        { id: "details", label: "Details", number: 1 },
        { id: "comments", label: "Comments", number: 2 },
        { id: "whatsapp", label: "WhatsApp", number: 3, hidden: !showWhatsApp },
        { id: "activity", label: "Activity", number: showWhatsApp ? 4 : 3 },
      ]}
    >
      {(activeTabId) => (
        <div className="space-y-6">
          {activeTabId === "details" && (
            <EmployeeLeadDetailsTab
              liveClientId={liveClientId}
              isPending={isPending}
              onStartProgress={handleStartProgress}
            />
          )}

          {activeTabId === "comments" && (
            <LeadCommentsPanel
              leadId={lead.id}
              currentUserId={currentUserId}
              comments={comments}
              hasUnread={hasUnreadComments}
              authorNames={authorNames}
            />
          )}

          {activeTabId === "whatsapp" && showWhatsApp && (
            <WhatsAppChatPanel
              leadId={lead.id}
              clientName={lead.client_name}
              clientPhone={lead.client_phone}
              enabled
            />
          )}

          {activeTabId === "activity" && (
            <LeadTimelinePanel leadId={lead.id} initialUpdates={updates} />
          )}
        </div>
      )}
    </PageTabs>
  );
}
