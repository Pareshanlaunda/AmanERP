import type { Lead } from "@/lib/types/database";
import { decodeHarassmentFaced } from "@/lib/validations/harassment";
import type { OnboardingFormValues } from "@/lib/validations/onboarding";

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
