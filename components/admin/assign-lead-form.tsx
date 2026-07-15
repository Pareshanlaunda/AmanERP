"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { assignLead } from "@/lib/actions/leads";
import type { Profile } from "@/lib/types/database";
import { formatEmployeeOptionLabel } from "@/lib/labels/employees";
import { useLeadLiveOptional } from "@/components/shared/lead-live-provider";
import { AdditionalAssigneesPicker } from "@/components/admin/additional-assignees-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type AssignLeadFormProps = {
  leadId: string;
  employees: (Profile & { email?: string })[];
  currentAssignee?: string | null;
  currentAdditionalIds?: string[];
};

export function AssignLeadForm({
  leadId,
  employees,
  currentAssignee,
  currentAdditionalIds = [],
}: AssignLeadFormProps) {
  const leadLive = useLeadLiveOptional();
  const [isPending, startTransition] = useTransition();
  const [assignedTo, setAssignedTo] = useState(currentAssignee ?? "");
  const [additionalIds, setAdditionalIds] = useState<string[]>(currentAdditionalIds);
  const [comment, setComment] = useState(
    () => leadLive?.lead.assignment_comment?.trim() ?? ""
  );

  useEffect(() => {
    setAssignedTo(currentAssignee ?? "");
  }, [currentAssignee]);

  useEffect(() => {
    setAdditionalIds(currentAdditionalIds);
  }, [currentAdditionalIds]);

  useEffect(() => {
    if (leadLive?.lead.assignment_comment != null) {
      setComment(leadLive.lead.assignment_comment);
    }
  }, [leadLive?.lead.assignment_comment]);

  const existingComment = leadLive?.lead.assignment_comment?.trim() ?? "";
  const commentChanged = comment.trim() !== existingComment;
  const primaryChanged = assignedTo !== (currentAssignee ?? "");
  const additionalChanged = !sameIdSet(additionalIds, currentAdditionalIds);
  const isDirty = primaryChanged || additionalChanged || commentChanged;
  const hasExisting = Boolean(currentAssignee);

  function handlePrimaryChange(id: string) {
    setAssignedTo(id);
    setAdditionalIds((prev) => prev.filter((x) => x !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignedTo) {
      toast.error("Select a primary employee");
      return;
    }
    if (!isDirty) {
      toast.message("No changes to save");
      return;
    }

    const previousAssignee = currentAssignee ?? null;
    const previousAdditional = currentAdditionalIds;
    const previousStatus = leadLive?.lead.status;
    const previousComment = leadLive?.lead.assignment_comment ?? null;

    startTransition(async () => {
      leadLive?.setLeadOptimistic({
        assigned_to: assignedTo,
        status: previousStatus === "converted" || previousStatus === "lost" ? previousStatus : "assigned",
        assignment_comment: comment.trim() || previousComment,
        additional_assignee_ids: additionalIds,
      });

      const result = await assignLead({
        lead_id: leadId,
        assigned_to: assignedTo,
        additional_assignee_ids: additionalIds,
        // Only send when changed — blank without change means keep existing on server
        assignment_comment: commentChanged ? comment.trim() : undefined,
      });

      if (!result.success) {
        leadLive?.setLeadOptimistic({
          assigned_to: previousAssignee,
          status: previousStatus,
          assignment_comment: previousComment,
          additional_assignee_ids: previousAdditional,
        });
        toast.error(result.error);
        return;
      }

      if (result.warning) toast.warning(result.warning);
      if (primaryChanged && additionalChanged) {
        toast.success("Primary and additional employees updated");
      } else if (additionalChanged && !primaryChanged) {
        toast.success("Additional employees updated");
      } else if (hasExisting) {
        toast.success("Lead reassigned");
      } else {
        toast.success("Lead assigned to employee");
      }
    });
  }

  const submitLabel = useMemo(() => {
    if (isPending) return "Saving...";
    if (!hasExisting) return "Assign lead";
    if (primaryChanged && additionalChanged) return "Save assignment changes";
    if (additionalChanged) return "Update additional employees";
    if (primaryChanged) return "Change primary employee";
    return "Save changes";
  }, [isPending, hasExisting, primaryChanged, additionalChanged]);

  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">
          {hasExisting ? "Change assigned employees" : "Assign to employee"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Primary is required. Additional employees are optional — you can add or remove them anytime.
        </p>
      </div>
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Primary employee (required)</Label>
            <Select value={assignedTo} onValueChange={handlePrimaryChange}>
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
            primaryId={assignedTo || null}
            selectedIds={additionalIds}
            onChange={setAdditionalIds}
            disabled={isPending}
          />

          <div className="space-y-2">
            <Label htmlFor="assignment_comment">
              Additional info for employee (optional — edit to change; clearing saves empty note)
            </Label>
            <Textarea
              id="assignment_comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Context or instructions — shown under Additional info on the lead"
            />
          </div>
          <Button type="submit" disabled={isPending || !assignedTo || !isDirty} className="w-full sm:w-auto">
            {submitLabel}
          </Button>
        </form>
      </div>
    </section>
  );
}
