import type { Lead } from "@/lib/types/database";
import { isEmployeeOnLead } from "@/lib/leads/assignees";

export function isActiveEmployeeLead(lead: Lead, userId: string) {
  return (
    isEmployeeOnLead(lead, userId) &&
    lead.status !== "converted" &&
    lead.status !== "lost" &&
    lead.status !== "successful"
  );
}
