"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markLeadInProgress, markLeadSuccessful } from "@/lib/actions/leads";
import type { Lead, LeadStatus } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
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

export function AssignedLeadsTable({
  leads,
  emptyMessage,
}: {
  leads: Lead[];
  emptyMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [statusOverrides, setStatusOverrides] = useState<Record<string, LeadStatus>>({});
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);

  const displayLeads = leads
    .map((lead) =>
      statusOverrides[lead.id] ? { ...lead, status: statusOverrides[lead.id] } : lead
    )
    .filter(
      (lead) =>
        lead.status !== "converted" &&
        lead.status !== "lost" &&
        lead.status !== "successful"
    );

  function handleStartProgress(leadId: string) {
    startTransition(async () => {
      setPendingLeadId(leadId);
      setStatusOverrides((prev) => ({ ...prev, [leadId]: "in_progress" }));
      const result = await markLeadInProgress(leadId);
      setPendingLeadId(null);
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

  function handleMarkSuccessful(leadId: string) {
    startTransition(async () => {
      setPendingLeadId(leadId);
      setStatusOverrides((prev) => ({ ...prev, [leadId]: "converted" }));
      const result = await markLeadSuccessful(leadId);
      setPendingLeadId(null);
      if (!result.success) {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[leadId];
          return next;
        });
        toast.error(result.error);
        return;
      }
      if (result.warning) toast.warning(result.warning);
      toast.success(
        result.warning ? "Lead converted to client" : "Lead converted to client — admin notified"
      );
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
              <TableHead>Lang</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/employee/leads/${lead.id}`}
                    className="text-primary hover:underline"
                  >
                    {lead.client_name}
                  </Link>
                </TableCell>
                <TableCell>{lead.client_phone ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>
                  <LanguageBadge language={lead.preferred_language} />
                </TableCell>
                <TableCell>{formatDate(lead.assigned_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/employee/leads/${lead.id}`}>Open</Link>
                    </Button>
                    {lead.source === "whatsapp" && (
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/employee/leads/${lead.id}#whatsapp-chat`}>Chat</Link>
                      </Button>
                    )}
                    {lead.status === "assigned" && (
                      <Button
                        size="sm"
                        disabled={isPending && pendingLeadId === lead.id}
                        onClick={() => handleStartProgress(lead.id)}
                      >
                        Start Progress
                      </Button>
                    )}
                    {lead.status === "in_progress" && !lead.onboarding_record_id && (
                      <Button size="sm" asChild>
                        <Link href={`/onboarding/new?leadId=${lead.id}`}>Onboard Client</Link>
                      </Button>
                    )}
                    {lead.onboarding_record_id && lead.status === "in_progress" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isPending && pendingLeadId === lead.id}
                        onClick={() => handleMarkSuccessful(lead.id)}
                      >
                        {isPending && pendingLeadId === lead.id ? "Saving..." : "Mark Successful"}
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
                <Link
                  href={`/employee/leads/${lead.id}`}
                  className="data-card-title text-primary hover:underline"
                >
                  {lead.client_name}
                </Link>
                <p className="mt-1 text-muted-foreground">{lead.client_phone ?? "No phone"}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Assigned: {formatDate(lead.assigned_at)}</span>
              <LanguageBadge language={lead.preferred_language} />
            </div>
            <div className="data-card-actions">
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href={`/employee/leads/${lead.id}`}>Open</Link>
              </Button>
              {lead.source === "whatsapp" && (
                <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto">
                  <Link href={`/employee/leads/${lead.id}#whatsapp-chat`}>Chat</Link>
                </Button>
              )}
              {lead.status === "assigned" && (
                <Button
                  size="sm"
                  disabled={isPending && pendingLeadId === lead.id}
                  onClick={() => handleStartProgress(lead.id)}
                  className="w-full sm:w-auto"
                >
                  Start progress
                </Button>
              )}
              {lead.status === "in_progress" && !lead.onboarding_record_id && (
                <Button size="sm" asChild className="w-full sm:w-auto">
                  <Link href={`/onboarding/new?leadId=${lead.id}`}>Onboard</Link>
                </Button>
              )}
              {lead.onboarding_record_id && lead.status === "in_progress" && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isPending && pendingLeadId === lead.id}
                  onClick={() => handleMarkSuccessful(lead.id)}
                  className="w-full sm:w-auto"
                >
                  {isPending && pendingLeadId === lead.id ? "Saving..." : "Mark successful"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
