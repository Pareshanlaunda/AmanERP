import type { Lead } from "@/lib/types/database";

export function isActiveEmployeeLead(lead: Lead, userId: string) {
  return (
    lead.assigned_to === userId &&
    lead.status !== "converted" &&
    lead.status !== "lost"
  );
}
