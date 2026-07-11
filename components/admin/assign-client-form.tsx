"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { assignClient } from "@/lib/actions/clients";
import type { Profile } from "@/lib/types/database";
import { formatEmployeeOptionLabel } from "@/lib/labels/employees";
import { AdditionalAssigneesPicker } from "@/components/admin/additional-assignees-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

type AssignClientFormProps = {
  clientId: string;
  employees: (Profile & { email?: string })[];
  currentOwnerId: string;
  currentAdditionalIds?: string[];
  hasLinkedLead?: boolean;
};

export function AssignClientForm({
  clientId,
  employees,
  currentOwnerId,
  currentAdditionalIds = [],
  hasLinkedLead = false,
}: AssignClientFormProps) {
  const [isPending, startTransition] = useTransition();
  const [ownerId, setOwnerId] = useState(currentOwnerId);
  const [additionalIds, setAdditionalIds] = useState<string[]>(currentAdditionalIds);

  useEffect(() => {
    setOwnerId(currentOwnerId);
  }, [currentOwnerId]);

  useEffect(() => {
    setAdditionalIds(currentAdditionalIds);
  }, [currentAdditionalIds]);

  const primaryChanged = ownerId !== currentOwnerId;
  const additionalChanged = !sameIdSet(additionalIds, currentAdditionalIds);
  const isDirty = primaryChanged || additionalChanged;

  function handlePrimaryChange(id: string) {
    setOwnerId(id);
    setAdditionalIds((prev) => prev.filter((x) => x !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) {
      toast.error("Select a primary employee");
      return;
    }
    if (!isDirty) {
      toast.message("No changes to save");
      return;
    }

    startTransition(async () => {
      const result = await assignClient({
        client_id: clientId,
        submitted_by: ownerId,
        additional_assignee_ids: additionalIds,
        sync_lead: true,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (primaryChanged && additionalChanged) {
        toast.success(
          hasLinkedLead
            ? "Primary and additional employees updated (client + lead)"
            : "Primary and additional employees updated"
        );
      } else if (additionalChanged) {
        toast.success(
          hasLinkedLead
            ? "Additional employees updated on client and linked lead"
            : "Additional employees updated"
        );
      } else {
        toast.success(
          hasLinkedLead
            ? "Client and linked lead reassigned"
            : "Client reassigned to employee"
        );
      }
    });
  }

  const submitLabel = useMemo(() => {
    if (isPending) return "Saving...";
    if (primaryChanged && additionalChanged) return "Save assignment changes";
    if (additionalChanged) return "Update additional employees";
    if (primaryChanged) return "Change primary employee";
    return "Save changes";
  }, [isPending, primaryChanged, additionalChanged]);

  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">Change assigned employees</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Primary owner is required. Additional employees are optional — add or remove anytime.
          {hasLinkedLead
            ? " Changes sync to the linked lead’s primary and additional assignees."
            : ""}
        </p>
      </div>
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Primary employee (required)</Label>
            <Select value={ownerId} onValueChange={handlePrimaryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {formatEmployeeOptionLabel(employee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AdditionalAssigneesPicker
            employees={employees}
            primaryId={ownerId || null}
            selectedIds={additionalIds}
            onChange={setAdditionalIds}
            disabled={isPending || !hasLinkedLead}
          />
          {!hasLinkedLead && (
            <p className="text-xs text-muted-foreground">
              Additional employees apply when this client is linked to a lead.
            </p>
          )}

          <Button type="submit" disabled={isPending || !ownerId || !isDirty} className="w-full sm:w-auto">
            {submitLabel}
          </Button>
        </form>
      </div>
    </section>
  );
}
