"use client";

import type { Lead, LeadComment, LeadUpdate } from "@/lib/types/database";
import { LeadDetailPanel } from "@/components/employee/lead-detail-panel";
import { LeadLiveProvider } from "@/components/shared/lead-live-provider";

type EmployeeLeadDetailLiveProps = {
  currentUserId: string;
  lead: Lead;
  updates: LeadUpdate[];
  comments: LeadComment[];
  hasUnreadComments: boolean;
  authorNames: Record<string, string>;
  clientId?: string | null;
};

export function EmployeeLeadDetailLive(props: EmployeeLeadDetailLiveProps) {
  return (
    <LeadLiveProvider initialLead={props.lead}>
      <LeadDetailPanel {...props} />
    </LeadLiveProvider>
  );
}
