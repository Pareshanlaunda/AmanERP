import type { Lead } from "@/lib/types/database";
import { HARASSMENT_FACED_LABELS, LOAN_TYPE_LABELS } from "@/lib/types/database";
import { decodeHarassmentFaced } from "@/lib/validations/harassment";
import type { OnboardingFormValues } from "@/lib/validations/onboarding";
import {
  CLIENT_DETAILS_LABELS,
  formatCreditCardDisplay,
  formatPersonalLoanDisplay,
} from "@/lib/leads/client-details-fields";

export type WhatsAppOnboardingDefaults = {
  leadSource: string;
  whatsappRanges: {
    personalLoan: string | null;
    creditCard: string | null;
  };
  formDefaults: Pick<
    OnboardingFormValues,
    "client_name" | "client_email" | "client_contact_number" | "loan_type" | "harassment_answer" | "harassment_type"
  >;
};

export function buildOnboardingDefaultsFromLead(lead: Lead): WhatsAppOnboardingDefaults {
  const harassment = decodeHarassmentFaced(lead.harassment_faced);

  return {
    leadSource: lead.source,
    whatsappRanges: {
      personalLoan: lead.personal_loan_amount_range,
      creditCard: lead.credit_card_amount_range,
    },
    formDefaults: {
      client_name: lead.client_name,
      client_email: lead.client_email ?? undefined,
      client_contact_number: lead.client_phone ?? undefined,
      loan_type: lead.loan_type ?? undefined,
      harassment_answer: harassment.answer || undefined,
      harassment_type: harassment.type || undefined,
    },
  };
}

export function isWhatsAppLeadWithCapturedDetails(lead: Lead): boolean {
  return (
    lead.source === "whatsapp" &&
    Boolean(
      lead.loan_type ||
        lead.personal_loan_amount_range ||
        lead.credit_card_amount_range ||
        lead.harassment_faced
    )
  );
}

export function whatsAppLeadSummaryLines(lead: Lead): { label: string; value: string }[] {
  return [
    { label: CLIENT_DETAILS_LABELS.fullName, value: lead.client_name },
    { label: CLIENT_DETAILS_LABELS.mobile, value: lead.client_phone ?? "—" },
    {
      label: CLIENT_DETAILS_LABELS.loanType,
      value: lead.loan_type ? LOAN_TYPE_LABELS[lead.loan_type] : "—",
    },
    {
      label: CLIENT_DETAILS_LABELS.personalLoanAmount,
      value: formatPersonalLoanDisplay(lead.personal_loan_amount_range, lead.loan_amount),
    },
    {
      label: CLIENT_DETAILS_LABELS.creditCardAmount,
      value: formatCreditCardDisplay(lead.credit_card_amount_range),
    },
    {
      label: CLIENT_DETAILS_LABELS.recoveryHarassment,
      value: lead.harassment_faced ? HARASSMENT_FACED_LABELS[lead.harassment_faced] : "—",
    },
  ];
}
