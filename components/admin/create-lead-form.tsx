"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createLead } from "@/lib/actions/leads";
import type { LoanType, Profile } from "@/lib/types/database";
import { LOAN_TYPE_OPTIONS } from "@/lib/validations/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CreateLeadFormProps = {
  employees: (Profile & { email?: string })[];
};

export function CreateLeadForm({ employees }: CreateLeadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loanType, setLoanType] = useState<LoanType | "">("");
  const [assignedTo, setAssignedTo] = useState("");

  function handleSubmit(formData: FormData) {
    const loanAmountRaw = (formData.get("loan_amount") as string)?.trim();
    const loanAmount =
      loanAmountRaw && !Number.isNaN(Number(loanAmountRaw)) ? Number(loanAmountRaw) : undefined;

    startTransition(async () => {
      const result = await createLead({
        client_name: formData.get("client_name") as string,
        client_phone: (formData.get("client_phone") as string) || undefined,
        client_alternate_phone: (formData.get("client_alternate_phone") as string) || undefined,
        client_email: (formData.get("client_email") as string) || undefined,
        loan_amount: loanAmount,
        loan_type: loanType || undefined,
        notes: (formData.get("notes") as string) || undefined,
        assigned_to: assignedTo || undefined,
        assignment_comment: (formData.get("assignment_comment") as string) || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(assignedTo ? "Lead created and assigned" : "Lead created");
      router.push("/admin/dashboard");
      router.refresh();
    });
  }

  return (
    <section className="erp-panel w-full overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">Create lead</h2>
        <p className="section-subtitle">Add client details and optionally assign to an employee.</p>
      </div>
      <div className="p-4 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="client_name">Client name *</Label>
            <Input id="client_name" name="client_name" required placeholder="Full name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_phone">Mobile number</Label>
              <Input id="client_phone" name="client_phone" type="tel" placeholder="+91..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_alternate_phone">Alternate mobile number</Label>
              <Input
                id="client_alternate_phone"
                name="client_alternate_phone"
                type="tel"
                placeholder="+91..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_email">Email</Label>
            <Input id="client_email" name="client_email" type="email" placeholder="client@email.com" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loan_amount">Loan amount</Label>
              <Input
                id="loan_amount"
                name="loan_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Loan type</Label>
              <Select
                value={loanType || undefined}
                onValueChange={(value) => setLoanType(value as LoanType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Initial lead notes..." />
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Assign to employee</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional — leave unassigned to assign later from the lead page.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Employee</Label>
                {assignedTo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => setAssignedTo("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <Select
                value={assignedTo || undefined}
                onValueChange={setAssignedTo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No employees yet
                    </SelectItem>
                  ) : (
                    employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name ?? employee.email ?? "Employee"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {assignedTo && (
              <div className="space-y-2">
                <Label htmlFor="assignment_comment">Comment for employee (optional)</Label>
                <Textarea
                  id="assignment_comment"
                  name="assignment_comment"
                  rows={3}
                  placeholder="Instructions or context for this lead..."
                />
              </div>
            )}
          </div>

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending
              ? "Saving..."
              : assignedTo
                ? "Create & assign lead"
                : "Create lead"}
          </Button>
        </form>
      </div>
    </section>
  );
}
