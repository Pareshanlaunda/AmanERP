import type { Lead } from "@/lib/types/database";
import { HARASSMENT_FACED_LABELS, LOAN_TYPE_LABELS } from "@/lib/types/database";
import type { WhatsAppSlotAnswer } from "@/lib/botbiz/i18n-answer-maps";
import { formatDate } from "@/lib/format";
import { getOutcomeReasonLabel } from "@/lib/validations/lead-outcomes";
import {
  CLIENT_DETAILS_LABELS,
  formatCreditCardDisplay,
  formatPersonalLoanDisplay,
} from "@/lib/leads/client-details-fields";
import { getLeadAdditionalInfo, hasLeadAdditionalInfo } from "@/lib/leads/lead-notes-display";
import { SourceBadge } from "@/components/shared/source-badge";
import { LanguageBadge } from "@/components/shared/language-badge";

function slotByName(
  answers: WhatsAppSlotAnswer[] | null | undefined,
  slot: WhatsAppSlotAnswer["slot"]
): WhatsAppSlotAnswer | undefined {
  return answers?.find((a) => a.slot === slot);
}

function mediaLabel(url: string): string {
  if (/\.(ogg|opus|mp3|m4a|wav|aac)(\?|#|$)/i.test(url)) return "Voice note";
  if (/\.pdf(\?|#|$)/i.test(url)) return "PDF attachment";
  if (/\.(jpeg|jpg|png|gif|webp)(\?|#|$)/i.test(url)) return "Image";
  return "Attachment";
}

function SlotValue({
  label,
  answer,
  fallback,
}: {
  label: string;
  answer?: WhatsAppSlotAnswer;
  fallback: string;
}) {
  if (answer?.kind === "media") {
    return (
      <p>
        <span className="font-medium">{label}:</span>{" "}
        <a
          href={answer.raw}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {mediaLabel(answer.raw)} — open
        </a>
      </p>
    );
  }

  if (answer?.kind === "button" && answer.canonical) {
    return (
      <p>
        <span className="font-medium">{label}:</span> {answer.canonical}
        {answer.raw !== answer.canonical && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Original: {answer.raw}
          </span>
        )}
      </p>
    );
  }

  if (answer?.kind === "text") {
    return (
      <p className="whitespace-pre-wrap">
        <span className="font-medium">{label}:</span> {answer.raw}
      </p>
    );
  }

  return (
    <p>
      <span className="font-medium">{label}:</span> {fallback}
    </p>
  );
}

export function LeadInfoFields({
  lead,
  employeeNames,
}: {
  lead: Lead;
  /** Optional id → display name for primary + additional assignees */
  employeeNames?: Record<string, string>;
}) {
  const additionalInfo = getLeadAdditionalInfo(lead);
  const slots = lead.whatsapp_slot_answers as WhatsAppSlotAnswer[] | null | undefined;
  const primaryName = lead.assigned_to
    ? employeeNames?.[lead.assigned_to] ?? null
    : null;
  const additionalNames = (lead.additional_assignee_ids ?? [])
    .filter((id) => id !== lead.assigned_to)
    .map((id) => employeeNames?.[id] ?? "Employee");

  return (
    <>
      <SlotValue
        label={CLIENT_DETAILS_LABELS.fullName}
        answer={slotByName(slots, "name")}
        fallback={lead.client_name}
      />
      <SlotValue
        label={CLIENT_DETAILS_LABELS.mobile}
        answer={slotByName(slots, "phone")}
        fallback={lead.client_phone ?? "—"}
      />
      {lead.client_alternate_phone && (
        <p>
          <span className="font-medium">Alternate mobile:</span> {lead.client_alternate_phone}
        </p>
      )}
      {lead.client_email && (
        <p>
          <span className="font-medium">Email:</span> {lead.client_email}
        </p>
      )}
      <SlotValue
        label={CLIENT_DETAILS_LABELS.loanType}
        answer={slotByName(slots, "loan_type")}
        fallback={lead.loan_type ? LOAN_TYPE_LABELS[lead.loan_type] : "—"}
      />
      <SlotValue
        label={CLIENT_DETAILS_LABELS.personalLoanAmount}
        answer={slotByName(slots, "personal_loan")}
        fallback={formatPersonalLoanDisplay(lead.personal_loan_amount_range, lead.loan_amount)}
      />
      <SlotValue
        label={CLIENT_DETAILS_LABELS.creditCardAmount}
        answer={slotByName(slots, "credit_card")}
        fallback={formatCreditCardDisplay(lead.credit_card_amount_range)}
      />
      <SlotValue
        label={CLIENT_DETAILS_LABELS.recoveryHarassment}
        answer={slotByName(slots, "harassment")}
        fallback={
          lead.harassment_faced ? HARASSMENT_FACED_LABELS[lead.harassment_faced] : "—"
        }
      />
      {hasLeadAdditionalInfo(additionalInfo) && (
        <div className="rounded-md border border-border/60 bg-muted/40 p-3">
          <p className="font-medium">Additional info</p>
          {additionalInfo.assignmentComment && (
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {additionalInfo.assignmentComment}
            </p>
          )}
          {additionalInfo.notes && (
            <p
              className={`whitespace-pre-wrap text-muted-foreground ${
                additionalInfo.assignmentComment ? "mt-2 border-t border-border/50 pt-2" : "mt-2"
              }`}
            >
              {additionalInfo.notes}
            </p>
          )}
        </div>
      )}
      {lead.latest_outcome_category && lead.latest_outcome_reason && (
        <p>
          <span className="font-medium">Latest outcome:</span>{" "}
          {getOutcomeReasonLabel(lead.latest_outcome_category, lead.latest_outcome_reason)}
        </p>
      )}
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Source:</span>
        <SourceBadge source={lead.source} />
      </p>
      {lead.preferred_language && (
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Customer language:</span>
          <LanguageBadge language={lead.preferred_language} showFull />
        </p>
      )}
      {lead.assigned_to && (
        <p>
          <span className="font-medium">Primary assignee:</span>{" "}
          {primaryName ?? "Assigned"}
        </p>
      )}
      {additionalNames.length > 0 && (
        <p>
          <span className="font-medium">Additional employees:</span>{" "}
          {additionalNames.join(", ")}
        </p>
      )}
      <p>
        <span className="font-medium">Created:</span> {formatDate(lead.created_at)}
      </p>
    </>
  );
}
