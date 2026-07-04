import { z } from "zod";

export const OUTCOME_CATEGORIES = [
  { value: "active", label: "Active" },
  { value: "drop", label: "Drop" },
  { value: "reschedule", label: "Reschedule" },
  { value: "successful", label: "Successful" },
] as const;

export const ACTIVE_OUTCOME_REASONS = [
  { value: "will_call_back", label: "Will call back" },
  { value: "need_time_family", label: "Need time to discuss with family" },
  { value: "credit_report_asked", label: "Credit report details asked" },
  { value: "credit_report_downloaded", label: "Credit report downloaded" },
  { value: "will_pay_fees", label: "Will pay fees in few days" },
] as const;

export const DROP_OUTCOME_REASONS = [
  { value: "loan_amount_small", label: "Loan amount small" },
  { value: "balance_transfer", label: "Looking for balance transfer/consolidation" },
  { value: "no_financial_difficulty", label: "Not facing financial difficulty" },
  { value: "funds_issue", label: "Funds issue" },
  { value: "call_never_picked", label: "Call never picked" },
  { value: "never_responded", label: "Never responded" },
] as const;

export const RESCHEDULE_OUTCOME_REASONS = [
  { value: "reschedule_few_days", label: "Reschedule for few days" },
  { value: "reschedule_next_month", label: "Reschedule for next month" },
] as const;

export const SUCCESSFUL_OUTCOME_REASONS = ACTIVE_OUTCOME_REASONS;

export type OutcomeCategory = (typeof OUTCOME_CATEGORIES)[number]["value"];
export type OutcomeReasonValue =
  | (typeof ACTIVE_OUTCOME_REASONS)[number]["value"]
  | (typeof DROP_OUTCOME_REASONS)[number]["value"]
  | (typeof RESCHEDULE_OUTCOME_REASONS)[number]["value"];

export function getOutcomeReasonsForCategory(category: OutcomeCategory) {
  switch (category) {
    case "active":
      return ACTIVE_OUTCOME_REASONS;
    case "drop":
      return DROP_OUTCOME_REASONS;
    case "reschedule":
      return RESCHEDULE_OUTCOME_REASONS;
    case "successful":
      return SUCCESSFUL_OUTCOME_REASONS;
  }
}

export function getOutcomeReasonLabel(category: OutcomeCategory, reason: string) {
  return getOutcomeReasonsForCategory(category).find((item) => item.value === reason)?.label ?? reason;
}

export function getOutcomeCategoryLabel(category: OutcomeCategory) {
  return OUTCOME_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}

export function formatOutcomeSummary(category: OutcomeCategory, reason: string, notes?: string | null) {
  const label = getOutcomeReasonLabel(category, reason);
  const prefix = getOutcomeCategoryLabel(category);
  const base = `[${prefix}] ${label}`;
  const extra = notes?.trim();
  return extra ? `${base} — ${extra}` : base;
}

export const leadOutcomeSchema = z
  .object({
    lead_id: z.string().uuid(),
    category: z.enum(["active", "drop", "reschedule", "successful"]),
    reason: z.string().min(1, "Select a reason"),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const valid = getOutcomeReasonsForCategory(data.category).some((item) => item.value === data.reason);
    if (!valid) {
      ctx.addIssue({ code: "custom", message: "Invalid reason for this category", path: ["reason"] });
    }
  });

export type LeadOutcomeInput = z.infer<typeof leadOutcomeSchema>;
