"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markLeadInProgress } from "@/lib/actions/leads";
import type { Lead, LeadStatus } from "@/lib/types/database";
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

export function AssignedLeadsTable({
  leads,
  emptyMessage,
}: {
  leads: Lead[];
  emptyMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [statusOverrides, setStatusOverrides] = useState<Record<string, LeadStatus>>({});

  const displayLeads = leads.map((lead) =>
    statusOverrides[lead.id] ? { ...lead, status: statusOverrides[lead.id] } : lead
  );

  function handleStartProgress(leadId: string) {
    startTransition(async () => {
      setStatusOverrides((prev) => ({ ...prev, [leadId]: "in_progress" }));
      const result = await markLeadInProgress(leadId);
      if (!result.success) {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[leadId];
          return next;
        });
        toast.error(result.error);
      } else {
        toast.success("Lead marked in progress");
      }
    });
  }

  if (displayLeads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        {emptyMessage ?? "No leads assigned yet. New assignments will appear here."}
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
              <TableHead>Assigned</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.client_name}</TableCell>
                <TableCell>{lead.client_phone ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>{formatDate(lead.assigned_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/employee/leads/${lead.id}`}>Open</Link>
                    </Button>
                    {lead.status === "assigned" && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleStartProgress(lead.id)}
                      >
                        Start Progress
                      </Button>
                    )}
                    {lead.status === "in_progress" && (
                      <Button size="sm" asChild>
                        <Link href={`/onboarding/new?leadId=${lead.id}`}>Onboard Client</Link>
                      </Button>
                    )}
                    {lead.onboarding_record_id && lead.status === "in_progress" && (
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/employee/leads/${lead.id}`}>Mark Successful</Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="table-mobile">
        {displayLeads.map((lead) => (
          <div key={lead.id} className="data-card">
            <div className="data-card-header">
              <div>
                <div className="data-card-title">{lead.client_name}</div>
                <p className="mt-1 text-muted-foreground">{lead.client_phone ?? "No phone"}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Assigned: {formatDate(lead.assigned_at)}
            </p>
            <div className="data-card-actions">
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href={`/employee/leads/${lead.id}`}>Open</Link>
              </Button>
              {lead.status === "assigned" && (
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleStartProgress(lead.id)}
                  className="w-full sm:w-auto"
                >
                  Start progress
                </Button>
              )}
              {lead.status === "in_progress" && (
                <Button size="sm" asChild className="w-full sm:w-auto">
                  <Link href={`/onboarding/new?leadId=${lead.id}`}>Onboard</Link>
                </Button>
              )}
              {lead.onboarding_record_id && lead.status === "in_progress" && (
                <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
                  <Link href={`/employee/leads/${lead.id}`}>Mark successful</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
