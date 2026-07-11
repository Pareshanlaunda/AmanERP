import Link from "next/link";
import type { Lead, Profile } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { SourceBadge } from "@/components/shared/source-badge";
import { LanguageBadge } from "@/components/shared/language-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LeadsTableProps = {
  leads: Lead[];
  employees: Profile[];
  linkPrefix?: string;
  hideAssignedColumn?: boolean;
  emptyMessage?: string;
};

function formatAssignees(
  lead: Lead,
  employeeMap: Map<string, string>
): string {
  const primary = lead.assigned_to
    ? employeeMap.get(lead.assigned_to) ?? "Employee"
    : null;
  const extras = (lead.additional_assignee_ids ?? [])
    .filter((id) => id !== lead.assigned_to)
    .map((id) => employeeMap.get(id) ?? "Employee");

  if (!primary && extras.length === 0) return "—";
  if (!primary) return extras.join(", ");
  if (extras.length === 0) return primary;
  return `${primary} + ${extras.join(", ")}`;
}

export function LeadsTable({
  leads,
  employees,
  linkPrefix = "/admin/leads",
  hideAssignedColumn = false,
  emptyMessage,
}: LeadsTableProps) {
  const employeeMap = new Map(employees.map((e) => [e.id, e.full_name ?? "Employee"]));

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage ??
          (hideAssignedColumn
            ? "No leads assigned to this employee yet."
            : "No leads yet. Create your first test lead to get started.")}
      </div>
    );
  }

  return (
    <>
      <div className="table-desktop rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Lang</TableHead>
              <TableHead>Status</TableHead>
              {!hideAssignedColumn && <TableHead>Assigned To</TableHead>}
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.client_name}</TableCell>
                <TableCell>{lead.client_phone ?? "—"}</TableCell>
                <TableCell>
                  <SourceBadge source={lead.source} />
                </TableCell>
                <TableCell>
                  <LanguageBadge language={lead.preferred_language} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                {!hideAssignedColumn && (
                  <TableCell className="max-w-[14rem] truncate" title={formatAssignees(lead, employeeMap)}>
                    {formatAssignees(lead, employeeMap)}
                  </TableCell>
                )}
                <TableCell>{formatDate(lead.created_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`${linkPrefix}/${lead.id}`}
                      className="text-primary hover:underline"
                    >
                      View
                    </Link>
                    {lead.source === "whatsapp" && (
                      <Link
                        href={`${linkPrefix}/${lead.id}#whatsapp-chat`}
                        className="text-primary hover:underline"
                      >
                        Chat
                      </Link>
                    )}
                  </div>
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
              <div className="min-w-0">
                <div className="data-card-title">{lead.client_name}</div>
                <p className="mt-1 text-muted-foreground">{lead.client_phone ?? "No phone"}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            <div className="data-card-meta">
              <p className="flex flex-wrap items-center gap-2">
                Source: <SourceBadge source={lead.source} />
                <LanguageBadge language={lead.preferred_language} />
              </p>
              {!hideAssignedColumn && (
                <p>Assigned: {formatAssignees(lead, employeeMap)}</p>
              )}
              <p>Created: {formatDate(lead.created_at)}</p>
            </div>
            <div className="data-card-actions">
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href={`${linkPrefix}/${lead.id}`}>View lead</Link>
              </Button>
              {lead.source === "whatsapp" && (
                <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
                  <Link href={`${linkPrefix}/${lead.id}#whatsapp-chat`}>Chat</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
