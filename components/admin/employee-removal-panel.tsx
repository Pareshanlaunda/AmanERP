"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { assignClient } from "@/lib/actions/clients";
import { assignLead } from "@/lib/actions/leads";
import type { Lead, Profile } from "@/lib/types/database";
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
import { ClidBadge } from "@/components/shared/clid-badge";

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

function ReassignLeadRow({
  lead,
  employeeId,
  employees,
  onDone,
}: {
  lead: Lead;
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
      const result = await assignLead({
        lead_id: lead.id,
        assigned_to: targetId,
        additional_assignee_ids: (lead.additional_assignee_ids ?? []).filter(
          (id) => id !== employeeId && id !== targetId
        ),
        assignment_comment: lead.assignment_comment ?? undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${lead.client_name} reassigned`);
      onDone();
    });
  }

  return (
    <tr>
      <td className="font-medium">
        <Link href={`/admin/leads/${lead.id}`} className="text-primary hover:underline">
          {lead.client_name}
        </Link>
      </td>
      <td>
        <StatusBadge status={lead.status} />
      </td>
      <td className="text-muted-foreground">Lead (primary)</td>
      <td>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="w-full sm:w-[14rem]">
              <SelectValue placeholder="New assignee" />
            </SelectTrigger>
            <SelectContent>
              {options.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {formatEmployeeOptionLabel(employee)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" disabled={isPending || !targetId} onClick={handleReassign}>
            {isPending ? "Saving…" : "Reassign"}
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href={`/admin/leads/${lead.id}#assign`}>Open</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ReassignClientRow({
  client,
  employeeId,
  employees,
  onDone,
}: {
  client: ClientOnboarding;
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
      const result = await assignClient({
        client_id: client.id,
        submitted_by: targetId,
        additional_assignee_ids: [],
        sync_lead: Boolean(client.lead_id),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${client.client_name} reassigned`);
      onDone();
    });
  }

  return (
    <tr>
      <td className="font-medium">
        <Link href={`/admin/clients/${client.id}`} className="text-primary hover:underline">
          {client.client_name}
        </Link>
      </td>
      <td className="text-muted-foreground">—</td>
      <td>
        <span className="text-muted-foreground">Client</span>
        {client.client_id ? (
          <div className="mt-1">
            <ClidBadge clientId={client.client_id} />
          </div>
        ) : null}
      </td>
      <td>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="w-full sm:w-[14rem]">
              <SelectValue placeholder="New owner" />
            </SelectTrigger>
            <SelectContent>
              {options.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {formatEmployeeOptionLabel(employee)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" disabled={isPending || !targetId} onClick={handleReassign}>
            {isPending ? "Saving…" : "Reassign"}
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href={`/admin/clients/${client.id}`}>Open</Link>
          </Button>
        </div>
      </td>
    </tr>
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

  const ownedClients = clients;

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
            <li>Click <span className="font-medium text-foreground">Reactivate employee</span> above.</li>
            <li>They can sign in with their old password, or use <span className="font-medium text-foreground">Reset password</span> on Admin → Users.</li>
            <li>They reappear in assignment lists and the employee dashboard.</li>
          </ol>
        </div>
      </section>
    );
  }

  const canRemove = blockingPrimaryLeads.length === 0;

  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Before removing employee</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reassign open work below, then remove. Co-assignee-only leads drop automatically on
              remove.
            </p>
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
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-950 dark:text-emerald-100">
            No primary active leads left — safe to remove this employee.
          </p>
        ) : (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
            Reassign {blockingPrimaryLeads.length} primary active lead
            {blockingPrimaryLeads.length === 1 ? "" : "s"} before remove is allowed.
          </p>
        )}

        {(blockingPrimaryLeads.length > 0 || ownedClients.length > 0) && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Reassign</th>
                </tr>
              </thead>
              <tbody>
                {blockingPrimaryLeads.map((lead) => (
                  <ReassignLeadRow
                    key={`lead-${lead.id}`}
                    lead={lead}
                    employeeId={employeeId}
                    employees={employees}
                    onDone={onReassigned}
                  />
                ))}
                {ownedClients.map((client) => (
                  <ReassignClientRow
                    key={`client-${client.id}`}
                    client={client}
                    employeeId={employeeId}
                    employees={employees}
                    onDone={onReassigned}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {coAssigneeLeads.length > 0 ? (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Co-assignee only (auto-removed on delete)</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {coAssigneeLeads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/admin/leads/${lead.id}`} className="text-primary hover:underline">
                    {lead.client_name}
                  </Link>{" "}
                  · {lead.status.replace("_", " ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
