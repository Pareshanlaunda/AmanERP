"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormField } from "@/components/onboarding/form-section";

type Option = { value: string; label: string };

type RadioFieldGroupProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly Option[];
  error?: string;
  fullWidth?: boolean;
};

export function RadioFieldGroup<T extends FieldValues>({
  control,
  name,
  label,
  options,
  error,
  fullWidth,
}: RadioFieldGroupProps<T>) {
  return (
    <FormField label={label} error={error} fullWidth={fullWidth}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <RadioGroup
            value={field.value ?? ""}
            onValueChange={field.onChange}
            className="grid gap-2 sm:grid-cols-2"
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                <Label htmlFor={`${name}-${option.value}`} className="font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      />
    </FormField>
  );
}
