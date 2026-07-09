import { parseIndianLoanAmount } from "@/lib/botbiz/parse-loan-amount";

function lakhMultiplier(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes("crore") || lower.includes("करोड")) return 10_000_000;
  if (lower.includes("lakh") || lower.includes("lac") || lower.includes("लाख")) return 100_000;
  if (lower.includes("hazar") || lower.includes("thousand") || lower.includes("हजार")) return 1_000;
  return 1;
}

function parseRangeMidpoint(value: string): number | null {
  const text = value.trim();
  if (!text) return null;

  const rangeMatch = text.match(
    /(\d[\d,.\s]*)\s*[-–to]+\s*(\d[\d,.\s]*)\s*(lakh|lac|lakhs|lacs|crore|hazar|thousand|लाख)?/i
  );
  if (rangeMatch) {
    const low = parseIndianLoanAmount(rangeMatch[1]);
    const high = parseIndianLoanAmount(rangeMatch[2]);
    const multiplier = rangeMatch[3] ? lakhMultiplier(rangeMatch[3]) : 1;
    if (low != null && high != null) {
      return Math.round(((low * multiplier + high * multiplier) / 2) * 100) / 100;
    }
  }

  const singleWithUnit = text.match(/^(\d[\d,.\s]*)\s*(lakh|lac|lakhs|lacs|crore|hazar|thousand|लाख)$/i);
  if (singleWithUnit) {
    const base = parseIndianLoanAmount(singleWithUnit[1]);
    if (base != null) return base * lakhMultiplier(singleWithUnit[2]);
  }

  return parseIndianLoanAmount(text);
}

export function parseBotbizAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (!text) return null;

  const noLoanPatterns = [
    /no personal loan/i,
    /no credit card/i,
    /credit card nahi/i,
    /क्रेडिट कार्ड नहीं/i,
    /क्रेडिट कार्ड नाही/i,
    /personal loan nahi/i,
    /पर्सनल लोन नहीं/i,
    /nahi hai/i,
    /none/i,
  ];
  if (noLoanPatterns.some((pattern) => pattern.test(text))) return null;

  return parseRangeMidpoint(text) ?? parseIndianLoanAmount(text);
}
