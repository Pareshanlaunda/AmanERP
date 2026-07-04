"use client";

import type { LeadUpdate } from "@/lib/types/database";
import { OUTCOME_CATEGORY_LABELS } from "@/lib/types/database";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { getOutcomeReasonLabel } from "@/lib/validations/lead-outcomes";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";

type LeadTimelinePanelProps = {
  leadId: string;
  initialUpdates: LeadUpdate[];
};

export function LeadTimelinePanel({ leadId, initialUpdates }: LeadTimelinePanelProps) {
  const updates = useRealtimeRows({
    table: "lead_updates",
    initialRows: initialUpdates,
    channelName: `lead-updates:${leadId}`,
    filter: `lead_id=eq.${leadId}`,
    sortBy: "created_at",
    sortDescending: true,
  });

  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">Progress timeline</h2>
      </div>
      <div className="space-y-3 p-4 sm:p-6">
        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet.</p>
        ) : (
          updates.map((update) => (
            <div key={update.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">{formatDate(update.created_at)}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {update.outcome_category && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {OUTCOME_CATEGORY_LABELS[update.outcome_category]}
                    </span>
                  )}
                  {update.status && <StatusBadge status={update.status} />}
                </div>
              </div>
              {update.outcome_category && update.outcome_reason && (
                <p className="mt-2 text-xs font-medium text-primary">
                  {getOutcomeReasonLabel(update.outcome_category, update.outcome_reason)}
                </p>
              )}
              <p className="mt-2">{update.note}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
