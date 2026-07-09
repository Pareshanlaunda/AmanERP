import type { HarassmentFaced, LoanType } from "@/lib/types/database";

export type WhatsAppSlot =
  | "name"
  | "phone"
  | "loan_type"
  | "personal_loan"
  | "credit_card"
  | "harassment";

export type WhatsAppSlotKind = "button" | "text" | "media";

export type WhatsAppSlotAnswer = {
  slot: WhatsAppSlot;
  kind: WhatsAppSlotKind;
  raw: string;
  /** English/canonical when mapped from a known button */
  canonical?: string | null;
};

/** Detect Botbiz S3 / voice / image / PDF answers — never treat as loan amount. */
export function isMediaAnswer(value: unknown): boolean {
  if (value == null) return false;
  const text = String(value).trim();
  if (!/^https?:\/\//i.test(text)) return false;
  if (/wasabisys\.com|bot-data\.s3|amazonaws\.com/i.test(text)) return true;
  return /\.(ogg|opus|mp3|m4a|wav|aac|jpeg|jpg|png|gif|webp|pdf|mp4)(\?|#|$)/i.test(text);
}

const PERSONAL_LOAN_RANGE_CANONICAL: Record<string, string> = {
  "0-2 lakhs": "0-2 Lakhs",
  "0-2 लाख": "0-2 Lakhs",
  "2-5 lakhs": "2-5 Lakhs",
  "2-5 लाख": "2-5 Lakhs",
  "5-10 lakhs": "5-10 Lakhs",
  "5-10 लाख": "5-10 Lakhs",
  "11-20 lakhs": "11-20 Lakhs",
  "10-20 lakhs": "10-20 Lakhs",
  "10-20 लाख": "10-20 Lakhs",
  "20-50 lakhs": "20-50 Lakhs",
  "20-50 लाख": "20-50 Lakhs",
  "0-5 lakhs": "0-5 Lakhs",
  "0-5 लाख": "0-5 Lakhs",
  "no personal loan": "No Personal Loan",
  "पर्सनल लोन नहीं": "No Personal Loan",
  "कर्ज नाही": "No Personal Loan",
};

const CREDIT_CARD_RANGE_CANONICAL: Record<string, string> = {
  "0-2 lakhs": "0-2 Lakhs",
  "0-2 लाख": "0-2 Lakhs",
  "2-5 lakhs": "2-5 Lakhs",
  "2-5 लाख": "2-5 Lakhs",
  "5-10 lakhs": "5-10 Lakhs",
  "5-10 लाख": "5-10 Lakhs",
  "10-20 lakhs": "10-20 Lakhs",
  "10-20 लाख": "10-20 Lakhs",
  "20-50 lakhs": "20-50 Lakhs",
  "20-50 लाख": "20-50 Lakhs",
  "0-5 lakhs": "0-5 Lakhs",
  "0-5 लाख": "0-5 Lakhs",
  "no credit card": "No Credit Card",
  "credit card no": "No Credit Card",
  "क्रेडिट कार्ड नहीं": "No Credit Card",
  "क्रेडिट कार्ड नाही": "No Credit Card",
};

function normalizeLookupKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function canonicalizePersonalLoanRange(raw: string): string | null {
  const key = normalizeLookupKey(raw);
  return PERSONAL_LOAN_RANGE_CANONICAL[key] ?? PERSONAL_LOAN_RANGE_CANONICAL[raw.trim()] ?? null;
}

export function canonicalizeCreditCardRange(raw: string): string | null {
  const key = normalizeLookupKey(raw);
  return CREDIT_CARD_RANGE_CANONICAL[key] ?? CREDIT_CARD_RANGE_CANONICAL[raw.trim()] ?? null;
}

export function loanTypeCanonicalLabel(loanType: LoanType): string {
  const labels: Record<LoanType, string> = {
    secured: "Secured Loans",
    unsecured: "Unsecured Loans",
    both: "Both",
  };
  return labels[loanType];
}

export function harassmentCanonicalLabel(value: HarassmentFaced): string {
  const labels: Record<HarassmentFaced, string> = {
    no: "No Harassment",
    yes_calls: "Recovery Calls",
    yes_home_visit: "Home Visits",
    yes_calls_home_visit: "Both",
  };
  return labels[value];
}

export function classifySlotAnswer(
  slot: WhatsAppSlot,
  rawValue: unknown,
  options?: {
    loanType?: LoanType | null;
    harassment?: HarassmentFaced | null;
    rangeCanonical?: string | null;
  }
): WhatsAppSlotAnswer | null {
  if (rawValue == null) return null;
  const raw = String(rawValue).trim();
  if (!raw) return null;

  if (isMediaAnswer(raw)) {
    return { slot, kind: "media", raw, canonical: null };
  }

  if (slot === "loan_type" && options?.loanType) {
    return {
      slot,
      kind: "button",
      raw,
      canonical: loanTypeCanonicalLabel(options.loanType),
    };
  }

  if (slot === "harassment" && options?.harassment) {
    return {
      slot,
      kind: "button",
      raw,
      canonical: harassmentCanonicalLabel(options.harassment),
    };
  }

  if (
    (slot === "personal_loan" || slot === "credit_card") &&
    options?.rangeCanonical
  ) {
    const canonical = options.rangeCanonical;
    const isKnownEnglish =
      /Lakhs|No Personal Loan|No Credit Card/i.test(canonical);
    // Mapped from HI/MR button, or already English button label
    if (isKnownEnglish && (canonical !== raw || /Lakhs|No /i.test(raw))) {
      return { slot, kind: "button", raw, canonical };
    }
    // Free text stored as-is (same string in range column)
    return { slot, kind: "text", raw, canonical: null };
  }

  return { slot, kind: "text", raw, canonical: null };
}
