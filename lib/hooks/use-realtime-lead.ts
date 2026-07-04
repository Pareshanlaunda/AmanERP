"use client";

import type { Lead } from "@/lib/types/database";
import { useLeadLiveOrSubscribe } from "@/components/shared/lead-live-provider";

/** @deprecated Prefer useLeadLive() inside LeadLiveProvider. */
export function useRealtimeLead(initialLead: Lead) {
  return useLeadLiveOrSubscribe(initialLead).lead;
}
