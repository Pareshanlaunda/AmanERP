"use client";

import type { Lead, Profile } from "@/lib/types/database";
import { useRealtimeLead } from "@/lib/hooks/use-realtime-lead";
import { AssignLeadForm } from "@/components/admin/assign-lead-form";

type LiveAssignLeadSectionProps = {
  lead: Lead;
  employees: Profile[];
};

export function LiveAssignLeadSection({ lead: initialLead, employees }: LiveAssignLeadSectionProps) {
  const lead = useRealtimeLead(initialLead);

  if (lead.status === "converted" || lead.status === "lost") {
    return null;
  }

  return (
    <AssignLeadForm
      leadId={lead.id}
      employees={employees}
      currentAssignee={lead.assigned_to}
    />
  );
}
