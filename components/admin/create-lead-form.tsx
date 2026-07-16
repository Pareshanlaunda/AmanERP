"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createLead } from "@/lib/actions/leads";
import type { HarassmentFaced, LoanType, Profile } from "@/lib/types/database";
import {
  CLIENT_DETAILS_LABELS,
  CREDIT_CARD_RANGE_OPTIONS,
  LOAN_TYPE_OPTIONS,
  PERSONAL_LOAN_RANGE_OPTIONS,
  RECOVERY_HARASSMENT_OPTIONS,
} from "@/lib/validations/leads";
import { formatEmployeeOptionLabel } from "@/lib/labels/employees";
import { AdditionalAssigneesPicker } from "@/components/admin/additional-assignees-picker";
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
  const [personalLoanRange, setPersonalLoanRange] = useState("");
  const [creditCardRange, setCreditCardRange] = useState("");
  const [harassmentFaced, setHarassmentFaced] = useState<HarassmentFaced | "">("");
  const [assignedTo, setAssignedTo] = useState("");
  const [additionalIds, setAdditionalIds] = useState<string[]>([]);

  function handlePrimaryChange(id: string) {
    setAssignedTo(id);
    setAdditionalIds((prev) => prev.filter((x) => x !== id));
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createLead({
        client_name: formData.get("client_name") as string,
        client_phone: (formData.get("client_phone") as string) || undefined,
        client_alternate_phone: (formData.get("client_alternate_phone") as string) || undefined,
        client_email: (formData.get("client_email") as string) || undefined,
        loan_type: loanType || undefined,
        personal_loan_amount_range: personalLoanRange || undefined,
        credit_card_amount_range: creditCardRange || undefined,
        harassment_faced: harassmentFaced || undefined,
        notes: (formData.get("notes") as string) || undefined,
        assigned_to: assignedTo || undefined,
        additional_assignee_ids: assignedTo ? additionalIds : undefined,
        assignment_comment: (formData.get("assignment_comment") as string) || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (result.warning) toast.warning(result.warning);
      toast.success(assignedTo ? "Lead created and assigned" : "Lead created");
      router.push(result.leadId ? `/admin/leads/${result.leadId}` : "/admin/dashboard");
    });
  }

  return (
    <section className="erp-panel w-full overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">Create lead</h2>
        <p className="section-subtitle">
          Manual entry (walk-in, phone, referral). WhatsApp leads still come from the webhook — no
          chat on manual leads.
        </p>
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
            <Label htmlFor="client_name">{CLIENT_DETAILS_LABELS.fullName} *</Label>
            <Input id="client_name" name="client_name" required placeholder="Full name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_phone">{CLIENT_DETAILS_LABELS.mobile}</Label>
              <Input id="client_phone" name="client_phone" type="tel" placeholder="9876543210" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_alternate_phone">Alternate mobile number</Label>
              <Input
                id="client_alternate_phone"
                name="client_alternate_phone"
                type="tel"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_email">Email</Label>
            <Input id="client_email" name="client_email" type="email" placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>{CLIENT_DETAILS_LABELS.loanType}</Label>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{CLIENT_DETAILS_LABELS.personalLoanAmount}</Label>
              <Select value={personalLoanRange || undefined} onValueChange={setPersonalLoanRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {PERSONAL_LOAN_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{CLIENT_DETAILS_LABELS.creditCardAmount}</Label>
              <Select value={creditCardRange || undefined} onValueChange={setCreditCardRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {CREDIT_CARD_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{CLIENT_DETAILS_LABELS.recoveryHarassment}</Label>
            <Select
              value={harassmentFaced || undefined}
              onValueChange={(value) => setHarassmentFaced(value as HarassmentFaced)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {RECOVERY_HARASSMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional info (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Internal notes for the team — shown under Additional info on the lead"
            />
          </div>

          <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
            <div>
              <h3 className="text-sm font-semibold">Assign to employee</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional — leave unassigned to assign later from the lead page.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Primary employee</Label>
                {assignedTo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => {
                      setAssignedTo("");
                      setAdditionalIds([]);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <Select value={assignedTo || undefined} onValueChange={handlePrimaryChange}>
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
                        {formatEmployeeOptionLabel(employee)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {assignedTo && (
              <>
                <AdditionalAssigneesPicker
                  employees={employees}
                  primaryId={assignedTo}
                  selectedIds={additionalIds}
                  onChange={setAdditionalIds}
                  disabled={isPending}
                />
                <div className="space-y-2">
                  <Label htmlFor="assignment_comment">Additional info for employee (optional)</Label>
                  <Textarea
                    id="assignment_comment"
                    name="assignment_comment"
                    rows={3}
                    placeholder="Context or instructions — shown under Additional info on the lead"
                  />
                </div>
              </>
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
