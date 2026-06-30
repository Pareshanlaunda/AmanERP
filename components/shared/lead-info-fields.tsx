import type { Lead } from "@/lib/types/database";
import { LOAN_TYPE_LABELS } from "@/lib/types/database";
import { formatCurrency, formatDate } from "@/lib/format";

export function LeadInfoFields({ lead }: { lead: Lead }) {
  return (
    <>
      <p>
        <span className="font-medium">Mobile:</span> {lead.client_phone ?? "—"}
      </p>
      <p>
        <span className="font-medium">Alternate mobile:</span> {lead.client_alternate_phone ?? "—"}
      </p>
      <p>
        <span className="font-medium">Email:</span> {lead.client_email ?? "—"}
      </p>
      <p>
        <span className="font-medium">Loan amount:</span>{" "}
        {lead.loan_amount != null ? formatCurrency(lead.loan_amount) : "—"}
      </p>
      <p>
        <span className="font-medium">Loan type:</span>{" "}
        {lead.loan_type ? LOAN_TYPE_LABELS[lead.loan_type] : "—"}
      </p>
      <p>
        <span className="font-medium">Source:</span> {lead.source}
      </p>
      <p>
        <span className="font-medium">Created:</span> {formatDate(lead.created_at)}
      </p>
    </>
  );
}
