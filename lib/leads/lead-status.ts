export const CLOSED_LEAD_STATUSES = ["lost", "converted", "successful"] as const;

export function isActivePipelineLeadStatus(status: string): boolean {
  return !(CLOSED_LEAD_STATUSES as readonly string[]).includes(status);
}
