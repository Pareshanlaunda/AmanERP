export function buildWhatsAppLeadNotes(parts: {
  personalLoanAmount?: string | null;
  creditCardAmount?: string | null;
  loanTypeRaw?: string | null;
  extra?: string | null;
}): string | null {
  const lines: string[] = [];

  if (parts.loanTypeRaw?.trim()) {
    lines.push(`WhatsApp loan type: ${parts.loanTypeRaw.trim()}`);
  }
  if (parts.personalLoanAmount?.trim()) {
    lines.push(`Personal loan (WhatsApp): ${parts.personalLoanAmount.trim()}`);
  }
  if (parts.creditCardAmount?.trim()) {
    lines.push(`Credit card outstanding (WhatsApp): ${parts.creditCardAmount.trim()}`);
  }
  if (parts.extra?.trim()) {
    lines.push(parts.extra.trim());
  }

  return lines.length ? lines.join("\n") : null;
}
