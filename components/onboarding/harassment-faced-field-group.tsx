"use client";

import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
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
  const { field: answerField } = useController({ control, name: answerName });
  const { field: typeField } = useController({ control, name: typeName });

  return (
    <HarassmentFacedFields
      answer={(answerField.value as HarassmentAnswer | "") ?? ""}
      harassmentType={(typeField.value as HarassmentType | "") ?? ""}
      onAnswerChange={answerField.onChange}
      onTypeChange={typeField.onChange}
      answerError={answerError}
      typeError={typeError}
    />
  );
}
