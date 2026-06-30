"use client";

import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { useRealtimeRecord } from "@/lib/hooks/use-realtime-record";
import { ClientOnboardingDetails } from "@/components/shared/client-onboarding-details";

type LiveClientOnboardingDetailsProps = {
  clientId: string;
  initialClient: ClientOnboarding;
};

export function LiveClientOnboardingDetails({
  clientId,
  initialClient,
}: LiveClientOnboardingDetailsProps) {
  const client = useRealtimeRecord({
    table: "client_onboardings",
    recordId: clientId,
    initialRecord: initialClient,
    channelName: `client-onboarding:${clientId}`,
  });

  if (!client) {
    return (
      <p className="text-sm text-muted-foreground">This client record is no longer available.</p>
    );
  }

  return <ClientOnboardingDetails client={client} />;
}
