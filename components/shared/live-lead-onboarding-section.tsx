"use client";

import { useMemo } from "react";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { useLeadLive } from "@/components/shared/lead-live-provider";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { useRealtimeRecord } from "@/lib/hooks/use-realtime-record";
import { ClientOnboardingDetails } from "@/components/shared/client-onboarding-details";

type LiveLeadOnboardingSectionProps = {
  initialOnboarding: ClientOnboarding | null;
};

export function LiveLeadOnboardingSection({ initialOnboarding }: LiveLeadOnboardingSectionProps) {
  const { lead } = useLeadLive();
  const onboardingId = lead.onboarding_record_id ?? lead.converted_onboarding_id;

  const onboardingById = useRealtimeRecord({
    table: "client_onboardings",
    recordId: onboardingId,
    initialRecord: initialOnboarding,
    channelName: `lead-onboarding-by-id:${lead.id}:${onboardingId ?? "none"}`,
  });

  const onboardingsByLead = useRealtimeRows({
    table: "client_onboardings",
    initialRows: initialOnboarding && !onboardingId ? [initialOnboarding] : [],
    channelName: `lead-onboarding-by-lead:${lead.id}`,
    filter: `lead_id=eq.${lead.id}`,
    sortBy: "created_at",
    sortDescending: true,
    includeRow: () => true,
    enabled: !onboardingId,
  });

  const onboarding = useMemo(() => {
    if (onboardingId) return onboardingById;
    return onboardingsByLead[0] ?? null;
  }, [onboardingId, onboardingById, onboardingsByLead]);

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
