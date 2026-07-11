"use client";

import type { Profile } from "@/lib/types/database";
import { useLeadLive } from "@/components/shared/lead-live-provider";
import { AssignLeadForm } from "@/components/admin/assign-lead-form";

type LiveAssignLeadSectionProps = {
  employees: Profile[];
};

export function LiveAssignLeadSection({ employees }: LiveAssignLeadSectionProps) {
  const { lead } = useLeadLive();

  return (
    <AssignLeadForm
      leadId={lead.id}
      employees={employees}
      currentAssignee={lead.assigned_to}
      currentAdditionalIds={lead.additional_assignee_ids ?? []}
    />
  );
}
