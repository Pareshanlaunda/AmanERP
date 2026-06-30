"use client";

import type { Lead } from "@/lib/types/database";
import { useRealtimeLead } from "@/lib/hooks/use-realtime-lead";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";

type LiveLeadStatusProps = {
  lead: Lead;
  variant?: "badge" | "alerts" | "all";
};

export function LiveLeadStatus({ lead: initialLead, variant = "all" }: LiveLeadStatusProps) {
  const lead = useRealtimeLead(initialLead);
  const showBadge = variant === "badge" || variant === "all";
  const showAlerts = variant === "alerts" || variant === "all";

  return (
    <>
      {showBadge && <StatusBadge status={lead.status} />}
      {showAlerts && lead.status === "converted" && (
        <p className="font-medium text-green-700">This lead has been converted to a client.</p>
      )}
      {showAlerts && lead.status === "lost" && lead.lost_reason && (
        <div className="rounded-md bg-destructive/5 p-3 text-destructive">
          <p className="font-medium">Lost / not converted</p>
          <p className="mt-1">{lead.lost_reason}</p>
          <p className="mt-2 text-xs text-muted-foreground">Closed: {formatDate(lead.lost_at)}</p>
        </div>
      )}
    </>
  );
}
