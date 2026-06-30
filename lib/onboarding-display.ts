import {
  accommodationOptions,
  maritalStatusOptions,
  occupationOptions,
  type ClientOnboarding,
} from "@/lib/validations/onboarding";

const optionLabel = (
  options: readonly { value: string; label: string }[],
  value: string | null | undefined
) => options.find((o) => o.value === value)?.label ?? null;

export function formatOccupation(value: string | null | undefined) {
  return optionLabel(occupationOptions, value);
}

export function formatMaritalStatus(value: string | null | undefined) {
  return optionLabel(maritalStatusOptions, value);
}

export function formatAccommodation(value: string | null | undefined) {
  return optionLabel(accommodationOptions, value);
}

export function formatYesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  return value ? "Yes" : "No";
}

export type OnboardingField = {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
};

export type OnboardingSection = {
  title: string;
  description?: string;
  fields: OnboardingField[];
};

export function buildOnboardingSections(client: ClientOnboarding): OnboardingSection[] {
  const text = (value: string | null | undefined) => value?.trim() || null;
  const currency = (value: number | null | undefined) =>
    value === null || value === undefined ? null : String(value);
  const number = (value: number | null | undefined) =>
    value === null || value === undefined ? null : String(value);

  return [
    {
      title: "Client details",
      description: "Basic information about the client",
      fields: [
        { label: "Client name", value: client.client_name },
        { label: "Email", value: text(client.client_email) },
        { label: "Contact number", value: text(client.client_contact_number) },
        { label: "Parent/alternate phone", value: text(client.parent_alternate_phone) },
        { label: "Occupation", value: formatOccupation(client.occupation) },
        { label: "Marital status", value: formatMaritalStatus(client.marital_status) },
        { label: "Accommodation", value: formatAccommodation(client.accommodation) },
      ],
    },
    {
      title: "Financial details",
      description: "Loan and income information",
      fields: [
        { label: "Loan amount", value: currency(client.loan_amount) },
        { label: "Number of lenders", value: number(client.number_of_lenders) },
        { label: "Client monthly income", value: currency(client.client_monthly_income) },
        { label: "Parents monthly income", value: currency(client.parents_monthly_income) },
        { label: "Other income sources", value: currency(client.other_income_sources) },
        { label: "Family monthly income", value: currency(client.family_monthly_income) },
        { label: "Family monthly expenses", value: currency(client.family_monthly_expenses) },
        { label: "Salary bank", value: text(client.salary_bank) },
        { label: "Salary date", value: number(client.salary_date) },
        { label: "Previous monthly EMI", value: currency(client.previous_monthly_emi) },
        {
          label: "How EMIs were managed earlier",
          value: text(client.emi_management_notes),
          fullWidth: true,
        },
        {
          label: "Auto-debit lenders in salary account",
          value: text(client.auto_debit_lenders),
          fullWidth: true,
        },
        {
          label: "Blank cheque lenders",
          value: text(client.blank_cheque_lenders),
          fullWidth: true,
        },
      ],
    },
    {
      title: "Settlement & notes",
      fields: [
        { label: "Reasons for taking loan", value: text(client.loan_reasons), fullWidth: true },
        {
          label: "Reasons for not paying back loans",
          value: text(client.non_payment_reasons),
          fullWidth: true,
        },
        {
          label: "Source of settlement funds",
          value: text(client.settlement_funds_source),
          fullWidth: true,
        },
        {
          label: "Points explained in onboarding call",
          value: text(client.onboarding_call_points),
          fullWidth: true,
        },
      ],
    },
    {
      title: "Sensitive information",
      description: "Internal use only",
      fields: [
        {
          label: "Truecaller Premium agreed",
          value: formatYesNo(client.truecaller_premium_agreed),
        },
        { label: "CCTV agreed", value: formatYesNo(client.cctv_agreed) },
        { label: "Parents aware", value: formatYesNo(client.parents_aware) },
        { label: "Early drop likelihood", value: text(client.early_drop_likelihood) },
        { label: "Other comments", value: text(client.other_comments), fullWidth: true },
      ],
    },
    {
      title: "Advocate / CSA",
      fields: [
        { label: "Advocate name", value: client.advocate_name },
        { label: "Advocate email", value: client.advocate_email },
      ],
    },
  ];
}

export function hasOnboardingContent(client: ClientOnboarding) {
  return buildOnboardingSections(client).some((section) =>
    section.fields.some((field) => field.value)
  );
}
