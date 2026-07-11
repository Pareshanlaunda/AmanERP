"use client";

import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { submitOnboarding } from "@/lib/actions/onboarding";
import {
  accommodationOptions,
  earlyDropLikelihoodOptions,
  maritalStatusOptions,
  occupationOptions,
  onboardingFormSchema,
  yesNoOptions,
  type OnboardingFormValues,
} from "@/lib/validations/onboarding";
import { LOAN_TYPE_OPTIONS } from "@/lib/validations/leads";
import type { HarassmentAnswer, HarassmentType } from "@/lib/validations/harassment";
import type { LoanType } from "@/lib/types/database";
import { HarassmentFacedFieldGroup } from "@/components/onboarding/harassment-faced-field-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/onboarding/form-section";
import { RadioFieldGroup } from "@/components/onboarding/radio-field-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdvocateOption } from "@/lib/actions/advocates";

type OnboardingFormProps = {
  leadId?: string;
  advocates?: AdvocateOption[];
  defaultClientName?: string;
  defaultClientEmail?: string;
  defaultClientPhone?: string;
  defaultLoanType?: LoanType;
  defaultHarassmentAnswer?: HarassmentAnswer;
  defaultHarassmentType?: HarassmentType;
  whatsappPersonalLoanRange?: string | null;
};

export function OnboardingForm({
  leadId,
  advocates = [],
  defaultClientName = "",
  defaultClientEmail = "",
  defaultClientPhone = "",
  defaultLoanType,
  defaultHarassmentAnswer,
  defaultHarassmentType,
  whatsappPersonalLoanRange,
}: OnboardingFormProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    shouldUnregister: false,
    defaultValues: {
      client_name: defaultClientName,
      client_email: defaultClientEmail,
      client_contact_number: defaultClientPhone,
      advocate_id: "",
      advocate_email: "",
      advocate_name: "",
      loan_type: defaultLoanType,
      harassment_answer: defaultHarassmentAnswer,
      harassment_type: defaultHarassmentType,
    },
  });

  const clientIncome = watch("client_monthly_income");
  const parentsIncome = watch("parents_monthly_income");

  useEffect(() => {
    const client = Number(clientIncome) || 0;
    const parents = Number(parentsIncome) || 0;
    if (client || parents) {
      setValue("family_monthly_income", client + parents);
    }
  }, [clientIncome, parentsIncome, setValue]);

  function onSubmit(data: OnboardingFormValues) {
    startTransition(async () => {
      const result = await submitOnboarding(data, leadId ?? null);
      if (result && !result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <FormSection title="Client Details" description="Basic information about the client">
        <FormField label="Client's Name *" error={errors.client_name?.message}>
          <Input {...register("client_name")} placeholder="Full name" />
        </FormField>
        <FormField label="Client's Email" error={errors.client_email?.message}>
          <Input {...register("client_email")} type="email" placeholder="client@email.com" />
        </FormField>
        <FormField label="Client's Contact Number" error={errors.client_contact_number?.message}>
          <Input {...register("client_contact_number")} type="tel" placeholder="+91..." />
        </FormField>
        <FormField label="Parent/Alternate Phone Number" error={errors.parent_alternate_phone?.message}>
          <Input {...register("parent_alternate_phone")} type="tel" placeholder="+91..." />
        </FormField>
        <RadioFieldGroup
          control={control}
          name="occupation"
          label="Occupation"
          options={occupationOptions}
          error={errors.occupation?.message}
          fullWidth
        />
        <RadioFieldGroup
          control={control}
          name="marital_status"
          label="Marital Status"
          options={maritalStatusOptions}
          error={errors.marital_status?.message}
          fullWidth
        />
        <RadioFieldGroup
          control={control}
          name="accommodation"
          label="Accommodation"
          options={accommodationOptions}
          error={errors.accommodation?.message}
          fullWidth
        />
      </FormSection>

      <FormSection title="Financial Details" description="Loan and income information">
        <RadioFieldGroup
          control={control}
          name="loan_type"
          label="Loan type"
          options={LOAN_TYPE_OPTIONS}
          error={errors.loan_type?.message}
          fullWidth
        />
        <HarassmentFacedFieldGroup
          control={control}
          answerName="harassment_answer"
          typeName="harassment_type"
          answerError={errors.harassment_answer?.message}
          typeError={errors.harassment_type?.message}
        />
        <FormField label="Exact loan amount (₹)" error={errors.loan_amount?.message}>
          <Input
            {...register("loan_amount")}
            type="number"
            min="0"
            step="0.01"
            placeholder={
              whatsappPersonalLoanRange
                ? `WhatsApp range: ${whatsappPersonalLoanRange} — enter exact figure`
                : "Enter confirmed amount"
            }
          />
        </FormField>
        <FormField label="Number of Lenders" error={errors.number_of_lenders?.message}>
          <Input {...register("number_of_lenders")} type="number" min="0" step="1" placeholder="0" />
        </FormField>
        <FormField label="Client's Monthly Income" error={errors.client_monthly_income?.message}>
          <Input {...register("client_monthly_income")} type="number" min="0" step="0.01" placeholder="0" />
        </FormField>
        <FormField label="Parents Monthly Income" error={errors.parents_monthly_income?.message}>
          <Input {...register("parents_monthly_income")} type="number" min="0" step="0.01" placeholder="0" />
        </FormField>
        <FormField label="Other Sources Monthly Income" error={errors.other_income_sources?.message}>
          <Input {...register("other_income_sources")} type="number" min="0" step="0.01" placeholder="0" />
        </FormField>
        <FormField label="Family Monthly Income (auto-calculated)" error={errors.family_monthly_income?.message}>
          <Input {...register("family_monthly_income")} type="number" readOnly className="bg-muted" />
        </FormField>
        <FormField label="Family Monthly Expenses" error={errors.family_monthly_expenses?.message}>
          <Input {...register("family_monthly_expenses")} type="number" min="0" step="0.01" placeholder="0" />
        </FormField>
        <FormField label="Salary Account in Which Bank?" error={errors.salary_bank?.message}>
          <Input {...register("salary_bank")} placeholder="Bank name" />
        </FormField>
        <FormField label="Salary Date (1–31)" error={errors.salary_date?.message}>
          <Input {...register("salary_date")} type="number" min="1" max="31" placeholder="1" />
        </FormField>
        <FormField label="Monthly EMI (paid earlier)" error={errors.previous_monthly_emi?.message}>
          <Input {...register("previous_monthly_emi")} type="number" min="0" step="0.01" placeholder="0" />
        </FormField>
        <FormField label="How were EMIs managed earlier?" error={errors.emi_management_notes?.message} fullWidth>
          <Textarea {...register("emi_management_notes")} rows={3} />
        </FormField>
        <FormField
          label="Lenders that auto-debit in salary account (if any)"
          error={errors.auto_debit_lenders?.message}
          fullWidth
        >
          <Textarea {...register("auto_debit_lenders")} rows={2} />
        </FormField>
        <FormField
          label="Lenders to whom blank cheque given (if any)"
          error={errors.blank_cheque_lenders?.message}
          fullWidth
        >
          <Textarea {...register("blank_cheque_lenders")} rows={2} />
        </FormField>
      </FormSection>

      <FormSection title="Settlement & Notes">
        <FormField label="Reasons for taking loan" error={errors.loan_reasons?.message} fullWidth>
          <Textarea {...register("loan_reasons")} rows={3} />
        </FormField>
        <FormField
          label="Reasons for not being able to pay back loans"
          error={errors.non_payment_reasons?.message}
          fullWidth
        >
          <Textarea {...register("non_payment_reasons")} rows={3} />
        </FormField>
        <FormField label="Source of settlement funds" error={errors.settlement_funds_source?.message} fullWidth>
          <Textarea {...register("settlement_funds_source")} rows={3} />
        </FormField>
        <FormField label="Points explained in onboarding call" error={errors.onboarding_call_points?.message} fullWidth>
          <Textarea {...register("onboarding_call_points")} rows={3} />
        </FormField>
      </FormSection>

      <FormSection
        title="Sensitive Information"
        description="For internal purpose only"
      >
        <RadioFieldGroup
          control={control}
          name="truecaller_premium_agreed"
          label="Has the client agreed to subscribe to Truecaller Premium?"
          options={yesNoOptions}
          error={errors.truecaller_premium_agreed?.message}
        />
        <RadioFieldGroup
          control={control}
          name="cctv_agreed"
          label="Has the client agreed to install CCTV camera at home?"
          options={yesNoOptions}
          error={errors.cctv_agreed?.message}
        />
        <RadioFieldGroup
          control={control}
          name="parents_aware"
          label="Are parents aware of loans/settlement proceedings?"
          options={yesNoOptions}
          error={errors.parents_aware?.message}
        />
        <Controller
          control={control}
          name="early_drop_likelihood"
          render={({ field }) => (
            <FormField label="Likelihood of early drop" error={errors.early_drop_likelihood?.message}>
              <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select likelihood" />
                </SelectTrigger>
                <SelectContent>
                  {earlyDropLikelihoodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        />
        <FormField label="Any other comments" error={errors.other_comments?.message} fullWidth>
          <Textarea {...register("other_comments")} rows={3} />
        </FormField>
      </FormSection>

      <FormSection title="Advocate">
        <FormField label="Advocate name *" error={errors.advocate_id?.message ?? errors.advocate_name?.message}>
          <Controller
            name="advocate_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={(id) => {
                  field.onChange(id);
                  const selected = advocates.find((a) => a.id === id);
                  setValue("advocate_name", selected?.full_name ?? "", {
                    shouldValidate: true,
                  });
                  setValue("advocate_email", selected?.email ?? "", {
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select advocate" />
                </SelectTrigger>
                <SelectContent>
                  {advocates.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField label="Advocate email *" error={errors.advocate_email?.message}>
          <Input
            {...register("advocate_email")}
            type="email"
            readOnly
            className="bg-muted/40"
            placeholder="Auto-filled from selected advocate"
          />
        </FormField>
        <input type="hidden" {...register("advocate_name")} />
      </FormSection>

      <div className="form-sticky-footer">
        <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Submitting..." : "Submit onboarding"}
        </Button>
      </div>
    </form>
  );
}
