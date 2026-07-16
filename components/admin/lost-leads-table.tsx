import Link from "next/link";
import type { Lead } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function LostLeadsTable({
  leads,
  linkPrefix = "/admin/leads",
  emptyMessage,
}: {
  leads: Lead[];
  linkPrefix?: string;
  emptyMessage?: string;
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage ?? "No lost or rejected leads for this employee."}
      </div>
    );
  }

  return (
    <>
      <div className="table-desktop rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lost On</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`${linkPrefix}/${lead.id}`}
                    className="text-primary hover:underline"
                  >
                    {lead.client_name}
                  </Link>
                </TableCell>
                <TableCell>{lead.client_phone ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>{formatDate(lead.lost_at ?? lead.updated_at)}</TableCell>
                <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                  {lead.lost_reason ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="table-mobile">
        {leads.map((lead) => (
          <div key={lead.id} className="data-card">
            <div className="data-card-header">
              <Link
                href={`${linkPrefix}/${lead.id}`}
                className="data-card-title text-primary hover:underline"
              >
                {lead.client_name}
              </Link>
              <StatusBadge status={lead.status} />
            </div>
            <div className="data-card-meta">
              <p>{lead.client_phone ?? "No phone"}</p>
              <p>Lost: {formatDate(lead.lost_at ?? lead.updated_at)}</p>
            </div>
            <p className="mt-3 rounded-md bg-muted/50 p-3 text-foreground">
              {lead.lost_reason ?? "No reason recorded"}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
