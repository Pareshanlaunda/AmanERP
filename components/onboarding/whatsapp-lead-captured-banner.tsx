import type { Lead } from "@/lib/types/database";
import { whatsAppLeadSummaryLines } from "@/lib/leads/whatsapp-to-onboarding-defaults";

export function WhatsAppLeadCapturedBanner({ lead }: { lead: Lead }) {
  const lines = whatsAppLeadSummaryLines(lead);

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <p className="text-sm font-semibold text-primary">Already captured on WhatsApp</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Client_Details from Botbiz — no need to re-enter these. Confirm exact loan amount below
        if needed.
      </p>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {lines.map((line) => (
          <div key={line.label}>
            <dt className="text-xs font-medium text-muted-foreground">{line.label}</dt>
            <dd className="text-sm font-medium">{line.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
