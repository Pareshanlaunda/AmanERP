import {
  canonicalizeCreditCardRange,
  canonicalizePersonalLoanRange,
  isMediaAnswer,
} from "@/lib/botbiz/i18n-answer-maps";

/**
 * Normalize Botbiz range answers to English canonical labels when known.
 * Media URLs are rejected (never stored as amounts).
 * Unknown free text is kept as-is for display.
 */
export function normalizeRangeAnswer(
  value: unknown,
  kind: "personal_loan" | "credit_card" = "personal_loan"
): string | null {
  if (value == null || value === "") return null;
  if (isMediaAnswer(value)) return null;

  const text = String(value).trim().replace(/\s+/g, " ");
  if (!text) return null;

  const canonical =
    kind === "credit_card"
      ? canonicalizeCreditCardRange(text)
      : canonicalizePersonalLoanRange(text);

  return canonical ?? text;
}
