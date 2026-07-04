"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { HarassmentFacedFields } from "@/components/shared/harassment-faced-fields";
import type { HarassmentAnswer, HarassmentType } from "@/lib/validations/harassment";

type HarassmentFacedFieldGroupProps<T extends FieldValues> = {
  control: Control<T>;
  answerName: Path<T>;
  typeName: Path<T>;
  answerError?: string;
  typeError?: string;
};

export function HarassmentFacedFieldGroup<T extends FieldValues>({
  control,
  answerName,
  typeName,
  answerError,
  typeError,
}: HarassmentFacedFieldGroupProps<T>) {
  return (
    <Controller
      control={control}
      name={answerName}
      render={({ field: answerField }) => (
        <Controller
          control={control}
          name={typeName}
          render={({ field: typeField }) => (
            <HarassmentFacedFields
              answer={(answerField.value as HarassmentAnswer | "") ?? ""}
              harassmentType={(typeField.value as HarassmentType | "") ?? ""}
              onAnswerChange={answerField.onChange}
              onTypeChange={typeField.onChange}
              answerError={answerError}
              typeError={typeError}
            />
          )}
        />
      )}
    />
  );
}
