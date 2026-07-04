import Link from "next/link";

import type { Lead, Profile } from "@/lib/types/database";

import { formatDate } from "@/lib/format";

import { StatusBadge } from "@/components/shared/status-badge";

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

                  <StatusBadge status={lead.status} />

                </TableCell>

                {!hideAssignedColumn && (

                  <TableCell>

                    {lead.assigned_to ? employeeMap.get(lead.assigned_to) ?? "—" : "—"}

                  </TableCell>

                )}

                <TableCell>{formatDate(lead.created_at)}</TableCell>

                <TableCell>

                  <Link href={`${linkPrefix}/${lead.id}`} className="text-primary hover:underline">

                    View

                  </Link>

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

              {!hideAssignedColumn && (

                <p>

                  Assigned:{" "}

                  {lead.assigned_to ? employeeMap.get(lead.assigned_to) ?? "—" : "Unassigned"}

                </p>

              )}

              <p>Created: {formatDate(lead.created_at)}</p>

            </div>

            <div className="data-card-actions">

              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">

                <Link href={`${linkPrefix}/${lead.id}`}>View lead</Link>

              </Button>

            </div>

          </div>

        ))}

      </div>

    </>

  );

}

