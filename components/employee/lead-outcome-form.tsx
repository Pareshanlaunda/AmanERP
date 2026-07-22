"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { recordLeadOutcome } from "@/lib/actions/leads";
import type { OutcomeCategory } from "@/lib/types/database";
import {
  getOutcomeReasonsForCategory,
  OUTCOME_CATEGORIES,
  type OutcomeReasonValue,
} from "@/lib/validations/lead-outcomes";
import { useLeadLiveOptional } from "@/components/shared/lead-live-provider";
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

type LeadOutcomeFormProps = {
  leadId: string;
  clientName: string;
  canMarkSuccessful: boolean;
};

export function LeadOutcomeForm({ leadId, clientName, canMarkSuccessful }: LeadOutcomeFormProps) {
  const router = useRouter();
  const leadLive = useLeadLiveOptional();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<OutcomeCategory>("active");
  const [reason, setReason] = useState<OutcomeReasonValue | "">("");
  const [notes, setNotes] = useState("");

  const availableCategories = useMemo(
    () =>
      OUTCOME_CATEGORIES.filter(
        (item) => item.value !== "successful" || canMarkSuccessful
      ),
    [canMarkSuccessful]
  );

  const reasonOptions = useMemo(() => getOutcomeReasonsForCategory(category), [category]);

  useEffect(() => {
    setReason("");
  }, [category]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      toast.error("Select a reason");
      return;
    }

    startTransition(async () => {
      const previousStatus = leadLive?.lead.status;
      const previousOutcome = {
        latest_outcome_category: leadLive?.lead.latest_outcome_category,
        latest_outcome_reason: leadLive?.lead.latest_outcome_reason,
        lost_reason: leadLive?.lead.lost_reason,
        lost_at: leadLive?.lead.lost_at,
      };

      if (category === "drop") {
        leadLive?.setLeadOptimistic({ status: "lost" });
      } else if (category === "successful") {
        leadLive?.setLeadOptimistic({ status: "converted" });
      } else if (previousStatus === "assigned") {
        leadLive?.setLeadOptimistic({ status: "in_progress" });
      }

      const result = await recordLeadOutcome({
        lead_id: leadId,
        category,
        reason,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        leadLive?.setLeadOptimistic({
          status: previousStatus,
          ...previousOutcome,
        });
        toast.error(result.error);
        return;
      }

      if (result.warning) {
        toast.warning(result.warning);
      }

      if (category === "drop") {
        toast.success("Lead marked as lost");
        router.push("/employee/dashboard");
        return;
      }

      if (category === "successful") {
        toast.success(
          result.warning
            ? "Lead converted to client"
            : "Lead converted to client — admin notified"
        );
        router.push("/employee/dashboard");
        return;
      }

      toast.success(category === "reschedule" ? "Follow-up rescheduled" : "Lead update saved");
      setNotes("");
      setReason("");
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} disabled={isPending} className="w-full sm:w-auto">
        Update lead outcome
      </Button>
    );
  }

  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title text-base sm:text-lg">Update lead outcome</h2>
        <p className="section-subtitle">
          Record progress, reschedule, drop, or mark {clientName} as successful.
        </p>
      </div>
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Outcome type</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as OutcomeCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome type" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason || undefined} onValueChange={(value) => setReason(value as OutcomeReasonValue)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome-notes">Additional notes (optional)</Label>
            <Textarea
              id="outcome-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any extra context for admin..."
            />
          </div>

          {category === "successful" && !canMarkSuccessful && (
            <p className="text-sm text-destructive">Complete the onboarding form before marking successful.</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              disabled={isPending || !reason || (category === "successful" && !canMarkSuccessful)}
              className="w-full sm:w-auto"
              variant={category === "drop" ? "destructive" : "default"}
            >
              {isPending
                ? "Saving..."
                : category === "drop"
                  ? "Confirm drop / lost"
                  : category === "successful"
                    ? "Mark successful"
                    : "Save update"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
