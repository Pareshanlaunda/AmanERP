import type { HarassmentFaced, LoanType } from "@/lib/types/database";

/** Labels match the Botbiz Client_Details / WhatsApp input flow questions. */
export const CLIENT_DETAILS_LABELS = {
  fullName: "Full name",
  mobile: "Mobile number",
  loanType: "What type of Loan do you have?",
  personalLoanAmount: "Personal Loan amount",
  creditCardAmount: "Outstanding Credit Card Amount",
  recoveryHarassment: "Are you facing recovery harassment?",
} as const;

export const LOAN_TYPE_OPTIONS = [
  { value: "secured" as const, label: "Secured Loans" },
  { value: "unsecured" as const, label: "Unsecured Loans" },
  { value: "both" as const, label: "Both" },
];

export const PERSONAL_LOAN_RANGE_OPTIONS = [
  "0-2 Lakhs",
  "2-5 Lakhs",
  "5-10 Lakhs",
  "11-20 Lakhs",
  "20-50 Lakhs",
  "No Personal Loan",
] as const;

export const CREDIT_CARD_RANGE_OPTIONS = [
  "0-2 Lakhs",
  "2-5 Lakhs",
  "5-10 Lakhs",
  "10-20 Lakhs",
  "20-50 Lakhs",
  "No Credit Card",
] as const;

export const RECOVERY_HARASSMENT_OPTIONS: {
  value: HarassmentFaced;
  label: string;
}[] = [
  { value: "no", label: "No Harassment" },
  { value: "yes_calls", label: "Recovery Calls" },
  { value: "yes_home_visit", label: "Home Visits" },
  { value: "yes_calls_home_visit", label: "Both" },
];

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  secured: "Secured Loans",
  unsecured: "Unsecured Loans",
  both: "Both",
};

export const HARASSMENT_WHATSAPP_LABELS: Record<HarassmentFaced, string> = {
  no: "No Harassment",
  yes_calls: "Recovery Calls",
  yes_home_visit: "Home Visits",
  yes_calls_home_visit: "Both",
};

export function formatPersonalLoanDisplay(
  range: string | null | undefined,
  exactAmount: number | null | undefined
): string {
  if (range?.trim()) return range.trim();
  if (exactAmount != null) return `₹${exactAmount.toLocaleString("en-IN")} (confirmed)`;
  return "—";
}

export function formatCreditCardDisplay(range: string | null | undefined): string {
  return range?.trim() || "—";
}
