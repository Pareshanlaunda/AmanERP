"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { assignClient } from "@/lib/actions/clients";
import { assignLead } from "@/lib/actions/leads";
import type { Lead, LeadStatus, Profile } from "@/lib/types/database";
import type { ClientOnboarding } from "@/lib/validations/onboarding";
import { isActivePipelineLeadStatus } from "@/lib/leads/lead-status";
import { formatEmployeeOptionLabel } from "@/lib/labels/employees";
import { StatusBadge } from "@/components/shared/status-badge";
import { RemoveEmployeeButton } from "@/components/admin/remove-employee-button";
import { ReactivateEmployeeButton } from "@/components/admin/reactivate-employee-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClidBadge } from "@/components/shared/clid-badge";
import { cn } from "@/lib/utils";

type EmployeeRemovalPanelProps = {
  employeeId: string;
  employeeName: string;
  isActive: boolean;
  deactivatedAt?: string | null;
  leads: Lead[];
  clients: ClientOnboarding[];
  employees: (Profile & { email?: string })[];
  onReassigned: () => void;
};

type HandoffRow = {
  key: string;
  kind: "lead" | "client";
  name: string;
  href: string;
  openHref: string;
  statusLabel?: string;
  status?: LeadStatus;
  clid?: string | null;
  lead?: Lead;
  client?: ClientOnboarding;
};

function ReassignControls({
  targetId,
  onTargetChange,
  options,
  isPending,
  disabled,
  onReassign,
  openHref,
  selectPlaceholder,
}: {
  targetId: string;
  onTargetChange: (id: string) => void;
  options: (Profile & { email?: string })[];
  isPending: boolean;
  disabled?: boolean;
  onReassign: () => void;
  openHref: string;
  selectPlaceholder: string;
}) {
  const noOptions = options.length === 0;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={targetId} onValueChange={onTargetChange} disabled={disabled || noOptions}>
        <SelectTrigger className="w-full sm:min-w-[12rem] sm:max-w-[16rem]">
          <SelectValue placeholder={noOptions ? "No other employees" : selectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {formatEmployeeOptionLabel(employee)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending || !targetId || noOptions}
          onClick={onReassign}
        >
          {isPending ? "Saving…" : "Reassign"}
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={openHref}>Open record</Link>
        </Button>
      </div>
    </div>
  );
}

function HandoffRowActions({
  row,
  employeeId,
  employees,
  onDone,
}: {
  row: HandoffRow;
  employeeId: string;
  employees: (Profile & { email?: string })[];
  onDone: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [isPending, startTransition] = useTransition();
  const options = employees.filter((e) => e.id !== employeeId);

  function handleReassign() {
    if (!targetId) {
      toast.error("Select an employee");
      return;
    }

    startTransition(async () => {
      if (row.kind === "lead" && row.lead) {
        const lead = row.lead;
        const result = await assignLead({
          lead_id: lead.id,
          assigned_to: targetId,
          from_employee_id: employeeId,
          additional_assignee_ids: (lead.additional_assignee_ids ?? []).filter(
            (id) => id !== employeeId && id !== targetId
          ),
          assignment_comment: lead.assignment_comment ?? undefined,
        });
        if (!result.success) {
          toast.error(result.error);
          if (result.error.toLowerCase().includes("refresh")) onDone();
          return;
        }
        toast.success(`${lead.client_name} reassigned`);
        setTargetId("");
        onDone();
        return;
      }

      if (row.kind === "client" && row.client) {
        const client = row.client;
        const result = await assignClient({
          client_id: client.id,
          submitted_by: targetId,
          from_owner_id: employeeId,
          additional_assignee_ids: [],
          sync_lead: Boolean(client.lead_id),
        });
        if (!result.success) {
          toast.error(result.error);
          if (result.error.toLowerCase().includes("refresh")) onDone();
          return;
        }
        toast.success(`${client.client_name} reassigned`);
        setTargetId("");
        onDone();
      }
    });
  }

  return (
    <ReassignControls
      targetId={targetId}
      onTargetChange={setTargetId}
      options={options}
      isPending={isPending}
      onReassign={handleReassign}
      openHref={row.openHref}
      selectPlaceholder="Hand off to…"
    />
  );
}

export function EmployeeRemovalPanel({
  employeeId,
  employeeName,
  isActive,
  deactivatedAt,
  leads,
  clients,
  employees,
  onReassigned,
}: EmployeeRemovalPanelProps) {
  const assigneeOptions = useMemo(
    () => employees.filter((e) => e.id !== employeeId),
    [employees, employeeId]
  );

  const blockingPrimaryLeads = useMemo(
    () =>
      leads.filter(
        (lead) => lead.assigned_to === employeeId && isActivePipelineLeadStatus(lead.status)
      ),
    [leads, employeeId]
  );

  const coAssigneeLeads = useMemo(
    () =>
      leads.filter(
        (lead) =>
          lead.assigned_to !== employeeId &&
          isActivePipelineLeadStatus(lead.status) &&
          (lead.additional_assignee_ids ?? []).includes(employeeId)
      ),
    [leads, employeeId]
  );

  const handoffRows = useMemo(() => {
    const primaryLeadIds = new Set(blockingPrimaryLeads.map((lead) => lead.id));
    const rows: HandoffRow[] = blockingPrimaryLeads.map((lead) => ({
      key: `lead-${lead.id}`,
      kind: "lead",
      name: lead.client_name,
      href: `/admin/leads/${lead.id}`,
      openHref: `/admin/leads/${lead.id}#assign`,
      status: lead.status,
      lead,
    }));

    for (const client of clients) {
      if (client.lead_id && primaryLeadIds.has(client.lead_id)) continue;
      rows.push({
        key: `client-${client.id}`,
        kind: "client",
        name: client.client_name,
        href: `/admin/clients/${client.id}`,
        openHref: `/admin/clients/${client.id}`,
        statusLabel: "Client",
        clid: client.client_id,
        client,
      });
    }

    return rows;
  }, [blockingPrimaryLeads, clients]);

  if (!isActive) {
    return (
      <section className="erp-panel overflow-hidden border-dashed">
        <div className="border-b border-border/70 bg-muted/30 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title">Employee removed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Removed
                {deactivatedAt ? ` on ${new Date(deactivatedAt).toLocaleDateString()}` : ""}. Login
                is disabled; history is kept for audit.
              </p>
            </div>
            <ReactivateEmployeeButton
              employeeId={employeeId}
              employeeName={employeeName}
              isActive={false}
            />
          </div>
        </div>
        <div className="space-y-2 p-4 text-sm text-muted-foreground sm:p-6">
          <p className="font-medium text-foreground">To bring them back:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Click <span className="font-medium text-foreground">Reactivate employee</span> above.
            </li>
            <li>
              They can sign in with their old password, or use{" "}
              <span className="font-medium text-foreground">Reset password</span> on Admin → Users.
            </li>
            <li>They reappear in assignment lists and the employee dashboard.</li>
          </ol>
        </div>
      </section>
    );
  }

  const canRemove = blockingPrimaryLeads.length === 0;
  const workCount = handoffRows.length;

  return (
    <section className="erp-panel overflow-hidden border-destructive/20">
      <div className="border-b border-border/70 bg-gradient-to-r from-destructive/5 via-accent/40 to-accent/20 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <UserMinus className="h-4 w-4 shrink-0" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Remove employee</p>
            </div>
            <div>
              <h2 className="section-title">Hand off work for {employeeName}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Step 1 — reassign open leads and clients below. Step 2 — remove when the banner
                turns green. Co-assignee-only leads drop off automatically.
              </p>
            </div>
            <ol className="flex flex-wrap gap-2 text-xs font-medium">
              <li
                className={cn(
                  "rounded-full border px-3 py-1",
                  workCount > 0
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                )}
              >
                1 · Reassign {workCount > 0 ? workCount : "done"}
              </li>
              <li
                className={cn(
                  "rounded-full border px-3 py-1",
                  canRemove
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                    : "border-border bg-muted/50 text-muted-foreground"
                )}
              >
                2 · Remove employee
              </li>
            </ol>
          </div>
          <RemoveEmployeeButton
            employeeId={employeeId}
            employeeName={employeeName}
            activeLeadCount={blockingPrimaryLeads.length}
            isActive
          />
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        {canRemove ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
            No primary active leads left — safe to remove {employeeName}.
          </p>
        ) : (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
            Reassign {blockingPrimaryLeads.length} primary active lead
            {blockingPrimaryLeads.length === 1 ? "" : "s"} before remove is allowed.
          </p>
        )}

        {assigneeOptions.length === 0 && workCount > 0 ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            No other active employees to hand work to. Add or reactivate an employee first.
          </p>
        ) : null}

        {workCount > 0 ? (
          <>
            <div className="table-desktop overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="min-w-[18rem]">
                      <span className="inline-flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
                        Hand off
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {handoffRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">
                        <Link href={row.href} className="text-primary hover:underline">
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {row.status ? (
                          <StatusBadge status={row.status} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.kind === "lead" ? (
                          <span className="text-muted-foreground">Lead · primary</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Client</span>
                            {row.clid ? <ClidBadge clientId={row.clid} /> : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <HandoffRowActions
                          row={row}
                          employeeId={employeeId}
                          employees={employees}
                          onDone={onReassigned}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="table-mobile space-y-3">
              {handoffRows.map((row) => (
                <article key={row.key} className="data-card">
                  <div className="data-card-header">
                    <div className="min-w-0">
                      <Link href={row.href} className="data-card-title text-primary hover:underline">
                        {row.name}
                      </Link>
                      <div className="data-card-meta">
                        <p>{row.kind === "lead" ? "Lead · primary owner" : "Onboarded client"}</p>
                        {row.clid ? (
                          <div className="pt-1">
                            <ClidBadge clientId={row.clid} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {row.status ? <StatusBadge status={row.status} /> : null}
                  </div>
                  <div className="data-card-actions border-t border-border/60 pt-4">
                    <HandoffRowActions
                      row={row}
                      employeeId={employeeId}
                      employees={employees}
                      onDone={onReassigned}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : canRemove ? null : (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No open work listed — refresh the page if you still see active leads below.
          </div>
        )}

        {coAssigneeLeads.length > 0 ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Co-assignee only — no action needed</p>
            <p className="mt-1 text-muted-foreground">
              These drop off automatically when you remove {employeeName}.
            </p>
            <ul className="mt-3 space-y-2">
              {coAssigneeLeads.map((lead) => (
                <li key={lead.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/leads/${lead.id}`} className="text-primary hover:underline">
                    {lead.client_name}
                  </Link>
                  <StatusBadge status={lead.status} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
