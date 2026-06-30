"use client";

import { useCallback, useMemo } from "react";
import type { Lead } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { useRealtimeLead } from "@/lib/hooks/use-realtime-lead";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { useRealtimeRecord } from "@/lib/hooks/use-realtime-record";
import { ClientOnboardingDetails } from "@/components/shared/client-onboarding-details";

type LiveLeadOnboardingSectionProps = {
  lead: Lead;
  initialOnboarding: ClientOnboarding | null;
};

export function LiveLeadOnboardingSection({
  lead: initialLead,
  initialOnboarding,
}: LiveLeadOnboardingSectionProps) {
  const lead = useRealtimeLead(initialLead);
  const onboardingId = lead.onboarding_record_id ?? lead.converted_onboarding_id;

  const includeByLead = useCallback(
    (row: ClientOnboarding) => row.lead_id === lead.id,
    [lead.id]
  );

  const onboardingsByLead = useRealtimeRows({
    table: "client_onboardings",
    initialRows: initialOnboarding ? [initialOnboarding] : [],
    channelName: `lead-onboarding-by-lead:${lead.id}`,
    filter: `lead_id=eq.${lead.id}`,
    sortBy: "created_at",
    sortDescending: true,
    includeRow: includeByLead,
  });

  const onboardingById = useRealtimeRecord({
    table: "client_onboardings",
    recordId: onboardingId,
    initialRecord: initialOnboarding,
    channelName: `lead-onboarding-by-id:${onboardingId ?? "none"}`,
  });

  const onboarding = useMemo(() => {
    if (onboardingById) return onboardingById;
    return onboardingsByLead[0] ?? null;
  }, [onboardingById, onboardingsByLead]);

  if (onboarding) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="section-title">Client onboarding form</h2>
          <p className="section-subtitle">
            Full details submitted by the employee during onboarding.
          </p>
        </div>
        <ClientOnboardingDetails client={onboarding} />
      </section>
    );
  }

  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">Client onboarding form</h2>
      </div>
      <p className="p-4 text-sm text-muted-foreground sm:p-6">
        No onboarding form submitted yet for this lead.
      </p>
    </section>
  );
}
