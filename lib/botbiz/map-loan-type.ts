import type { LoanType } from "@/lib/types/database";

const LOAN_TYPE_ALIASES: Record<string, LoanType> = {
  secured: "secured",
  "secured loans": "secured",
  "secured loan": "secured",
  "सिक्योर्ड लोन": "secured",
  "तारण secured": "secured",
  unsecured: "unsecured",
  "unsecured loans": "unsecured",
  "unsecured loan": "unsecured",
  "अनसिक्योर्ड लोन": "unsecured",
  "विनातारण unsecured": "unsecured",
  both: "both",
  दोनों: "both",
  दोन्ही: "both",
  "दोनों both": "both",
};

export function mapBotbizLoanType(value: unknown): LoanType | null {
  if (value == null || value === "") return null;
  const key = String(value).trim().toLowerCase();
  if (LOAN_TYPE_ALIASES[key]) return LOAN_TYPE_ALIASES[key];
  if (key.includes("both") || key.includes("दोन")) return "both";
  if (key.includes("unsecured") || key.includes("अनसिक्य")) return "unsecured";
  if (key.includes("secured") || key.includes("सिक्यो") || key.includes("तारण")) {
    return "secured";
  }
  return null;
}
