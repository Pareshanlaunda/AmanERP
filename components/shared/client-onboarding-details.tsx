import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { buildOnboardingSections } from "@/lib/onboarding-display";
import { formatCurrency, formatDate } from "@/lib/format";
import { ClidBadge } from "@/components/shared/clid-badge";

function displayValue(label: string, raw: string | null | undefined) {
  if (!raw) return "—";

  const currencyLabels = new Set([
    "Loan amount",
    "Client monthly income",
    "Parents monthly income",
    "Other income sources",
    "Family monthly income",
    "Family monthly expenses",
    "Previous monthly EMI",
  ]);

  if (currencyLabels.has(label)) {
    const num = Number(raw);
    return Number.isNaN(num) ? raw : formatCurrency(num);
  }

  return raw;
}

type ClientOnboardingDetailsProps = {
  client: ClientOnboarding;
  showSubmittedMeta?: boolean;
};

export function ClientOnboardingDetails({
  client,
  showSubmittedMeta = true,
}: ClientOnboardingDetailsProps) {
  const sections = buildOnboardingSections(client);

  return (
    <div className="space-y-6">
      {(client.client_id || showSubmittedMeta) && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {client.client_id ? <ClidBadge clientId={client.client_id} /> : null}
          {showSubmittedMeta && (
            <span className="text-muted-foreground">
              Submitted {formatDate(client.created_at)}
            </span>
          )}
        </div>
      )}

      {sections.map((section) => (
        <section key={section.title} className="erp-panel overflow-hidden">
          <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
            <h3 className="section-title text-base sm:text-lg">{section.title}</h3>
            {section.description && <p className="section-subtitle">{section.description}</p>}
          </div>
          <dl className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            {section.fields.map((field) => (
              <div
                key={field.label}
                className={field.fullWidth ? "sm:col-span-2" : undefined}
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {displayValue(field.label, field.value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
