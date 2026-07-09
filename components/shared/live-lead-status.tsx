"use client";

import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLeadLive } from "@/components/shared/lead-live-provider";

type LiveLeadStatusProps = {
  variant?: "badge" | "alerts" | "all";
};

export function LiveLeadStatus({ variant = "all" }: LiveLeadStatusProps) {
  const { lead } = useLeadLive();
  const showBadge = variant === "badge" || variant === "all";
  const showAlerts = variant === "alerts" || variant === "all";

  return (
    <>
      {showBadge && <StatusBadge status={lead.status} />}
      {showAlerts && lead.status === "converted" && (
        <p className="font-medium text-emerald-700 dark:text-emerald-400">This lead has been converted to a client.</p>
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
