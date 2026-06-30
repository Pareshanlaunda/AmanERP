"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { assignLead } from "@/lib/actions/leads";
import type { Profile } from "@/lib/types/database";
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

type AssignLeadFormProps = {
  leadId: string;
  employees: (Profile & { email?: string })[];
  currentAssignee?: string | null;
};

export function AssignLeadForm({ leadId, employees, currentAssignee }: AssignLeadFormProps) {
  const [isPending, startTransition] = useTransition();
  const [assignedTo, setAssignedTo] = useState(currentAssignee ?? "");
  const [comment, setComment] = useState("");

  useEffect(() => {
    setAssignedTo(currentAssignee ?? "");
  }, [currentAssignee]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignedTo) {
      toast.error("Select an employee");
      return;
    }

    startTransition(async () => {
      const result = await assignLead({
        lead_id: leadId,
        assigned_to: assignedTo,
        assignment_comment: comment || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Lead assigned to employee");
    });
  }

  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">Assign to employee</h2>
      </div>
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name ?? employee.email ?? employee.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignment_comment">Comment for employee (optional)</Label>
            <Textarea
              id="assignment_comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Instructions or context for this lead..."
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Assigning..." : "Assign lead"}
          </Button>
        </form>
      </div>
    </section>
  );
}
