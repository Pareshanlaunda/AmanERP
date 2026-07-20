"use client";

import { NoticeSelectButton } from "@/components/shared/notice-select-button";
import type { ClientOnboarding } from "@/lib/validations/onboarding";

type Props = {
  client: ClientOnboarding;
  latestNoticeId?: string | null;
};

/** Generate / view / download Reply Notice — admin + any employee with client access. */
export function ClientNoticePanel({ client, latestNoticeId = null }: Props) {
  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-3 sm:px-6">
        <h2 className="section-title text-base sm:text-lg">Reply notice</h2>
        <p className="section-subtitle text-sm">
          Generate Word or PDF for this client. Admins and all employees with access can use this.
        </p>
      </div>
      <div className="px-4 py-4 sm:px-6">
        <NoticeSelectButton client={client} latestNoticeId={latestNoticeId} />
      </div>
    </section>
  );
}
