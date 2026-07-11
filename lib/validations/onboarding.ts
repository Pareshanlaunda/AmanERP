import { z } from "zod";
import { harassmentAnswerSchema, harassmentTypeSchema, encodeHarassmentFaced } from "@/lib/validations/harassment";
import { loanTypeSchema } from "@/lib/validations/leads";

export const occupationOptions = [
  { value: "government_employee", label: "Government Employee" },
  { value: "private_employee", label: "Private Employee" },
  { value: "small_business", label: "Small Business" },
  { value: "business_10_plus", label: "Business with more than 10 employees" },
] as const;

export const maritalStatusOptions = [
  { value: "single", label: "Single" },
  { value: "married_no_kids", label: "Married with no kids" },
  { value: "married_with_kids", label: "Married with kids" },
  { value: "divorced_separated", label: "Divorced/Separated" },
] as const;

export const accommodationOptions = [
  { value: "owned_by_client", label: "Owned by client" },
  { value: "owned_by_parents", label: "Owned by parents" },
  { value: "rented_gated", label: "Rented (Gated)" },
  { value: "rented_not_gated", label: "Rented (Not gated)" },
] as const;

export const yesNoOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export const earlyDropLikelihoodOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const optionalNumberField = z.union([z.string(), z.number()]).optional();
const optionalIntField = z.union([z.string(), z.number()]).optional();

export const onboardingFormSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  client_email: z.string().optional(),
  client_contact_number: z.string().optional(),
  occupation: z
    .enum([
      "government_employee",
      "private_employee",
      "small_business",
      "business_10_plus",
    ])
    .optional(),
  marital_status: z
    .enum(["single", "married_no_kids", "married_with_kids", "divorced_separated"])
    .optional(),
  accommodation: z
    .enum(["owned_by_client", "owned_by_parents", "rented_gated", "rented_not_gated"])
    .optional(),
  parent_alternate_phone: z.string().optional(),
  loan_type: loanTypeSchema.optional(),
  harassment_answer: harassmentAnswerSchema.optional(),
  harassment_type: harassmentTypeSchema.optional(),
  loan_amount: optionalNumberField,
  number_of_lenders: optionalIntField,
  client_monthly_income: optionalNumberField,
  salary_bank: z.string().optional(),
  salary_date: optionalIntField.refine(
    (val) => val === undefined || val === "" || (Number(val) >= 1 && Number(val) <= 31),
    "Salary date must be between 1 and 31"
  ),
  auto_debit_lenders: z.string().optional(),
  blank_cheque_lenders: z.string().optional(),
  parents_monthly_income: optionalNumberField,
  other_income_sources: optionalNumberField,
  family_monthly_income: optionalNumberField,
  family_monthly_expenses: optionalNumberField,
  previous_monthly_emi: optionalNumberField,
  emi_management_notes: z.string().optional(),
  loan_reasons: z.string().optional(),
  non_payment_reasons: z.string().optional(),
  settlement_funds_source: z.string().optional(),
  onboarding_call_points: z.string().optional(),
  truecaller_premium_agreed: z.enum(["yes", "no"]).optional(),
  cctv_agreed: z.enum(["yes", "no"]).optional(),
  parents_aware: z.enum(["yes", "no"]).optional(),
  early_drop_likelihood: z.enum(["low", "medium", "high"]).optional(),
  other_comments: z.string().optional(),
  /** Selected advocate employee profile id */
  advocate_id: z
    .string()
    .min(1, "Select an advocate")
    .uuid("Select an advocate"),
  advocate_name: z.string().min(1, "Advocate name is required"),
  advocate_email: z.string().email("Valid advocate email is required"),
}).superRefine((data, ctx) => {
  if (data.harassment_answer === "yes" && !data.harassment_type) {
    ctx.addIssue({
      code: "custom",
      message: "Select calls or home visit",
      path: ["harassment_type"],
    });
  }
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export type ClientOnboarding = {
  id: string;
  created_at: string;
  submitted_by: string;
  lead_id: string | null;
  client_id: string | null;
  client_name: string;
  client_email: string | null;
  client_contact_number: string | null;
  occupation: string | null;
  marital_status: string | null;
  accommodation: string | null;
  parent_alternate_phone: string | null;
  loan_type: string | null;
  harassment_faced: string | null;
  loan_amount: number | null;
  number_of_lenders: number | null;
  client_monthly_income: number | null;
  salary_bank: string | null;
  salary_date: number | null;
  auto_debit_lenders: string | null;
  blank_cheque_lenders: string | null;
  parents_monthly_income: number | null;
  other_income_sources: number | null;
  family_monthly_income: number | null;
  family_monthly_expenses: number | null;
  previous_monthly_emi: number | null;
  emi_management_notes: string | null;
  loan_reasons: string | null;
  non_payment_reasons: string | null;
  settlement_funds_source: string | null;
  onboarding_call_points: string | null;
  truecaller_premium_agreed: boolean | null;
  cctv_agreed: boolean | null;
  parents_aware: boolean | null;
  early_drop_likelihood: string | null;
  other_comments: string | null;
  advocate_name: string;
  advocate_email: string;
};

function toNullableText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toNullableNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isNaN(num) ? null : num;
}

function toNullableInt(value: string | number | undefined): number | null {
  const num = toNullableNumber(value);
  return num === null ? null : Math.trunc(num);
}

function yesNoToBoolean(value: "yes" | "no" | undefined): boolean | null {
  if (!value) return null;
  return value === "yes";
}

export function toDbPayload(data: OnboardingFormValues) {
  const clientIncome = toNullableNumber(data.client_monthly_income) ?? 0;
  const parentsIncome = toNullableNumber(data.parents_monthly_income) ?? 0;

  return {
    client_name: data.client_name.trim(),
    client_email: toNullableText(data.client_email),
    client_contact_number: toNullableText(data.client_contact_number),
    occupation: data.occupation ?? null,
    marital_status: data.marital_status ?? null,
    accommodation: data.accommodation ?? null,
    parent_alternate_phone: toNullableText(data.parent_alternate_phone),
    loan_type: data.loan_type ?? null,
    harassment_faced: encodeHarassmentFaced(data.harassment_answer, data.harassment_type) ?? null,
    loan_amount: toNullableNumber(data.loan_amount),
    number_of_lenders: toNullableInt(data.number_of_lenders),
    client_monthly_income: toNullableNumber(data.client_monthly_income),
    salary_bank: toNullableText(data.salary_bank),
    salary_date: toNullableInt(data.salary_date),
    auto_debit_lenders: toNullableText(data.auto_debit_lenders),
    blank_cheque_lenders: toNullableText(data.blank_cheque_lenders),
    parents_monthly_income: toNullableNumber(data.parents_monthly_income),
    other_income_sources: toNullableNumber(data.other_income_sources),
    family_monthly_income:
      toNullableNumber(data.family_monthly_income) ?? clientIncome + parentsIncome,
    family_monthly_expenses: toNullableNumber(data.family_monthly_expenses),
    previous_monthly_emi: toNullableNumber(data.previous_monthly_emi),
    emi_management_notes: toNullableText(data.emi_management_notes),
    loan_reasons: toNullableText(data.loan_reasons),
    non_payment_reasons: toNullableText(data.non_payment_reasons),
    settlement_funds_source: toNullableText(data.settlement_funds_source),
    onboarding_call_points: toNullableText(data.onboarding_call_points),
    truecaller_premium_agreed: yesNoToBoolean(data.truecaller_premium_agreed),
    cctv_agreed: yesNoToBoolean(data.cctv_agreed),
    parents_aware: yesNoToBoolean(data.parents_aware),
    early_drop_likelihood: data.early_drop_likelihood ?? null,
    other_comments: toNullableText(data.other_comments),
    advocate_name: data.advocate_name.trim(),
    advocate_email: data.advocate_email.trim(),
  };
}
