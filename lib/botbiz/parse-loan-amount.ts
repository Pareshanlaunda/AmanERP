export function parseIndianLoanAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const digitsOnly = raw.replace(/[^\d.]/g, "");
  if (!digitsOnly) return null;

  const parsed = Number.parseFloat(digitsOnly);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}
