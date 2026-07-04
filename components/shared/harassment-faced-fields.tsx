"use client";

import type { HarassmentAnswer, HarassmentFacedValue, HarassmentType } from "@/lib/validations/harassment";
import {
  HARASSMENT_ANSWER_OPTIONS,
  HARASSMENT_TYPE_OPTIONS,
} from "@/lib/validations/harassment";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HarassmentFacedFieldsProps = {
  answer: HarassmentAnswer | "";
  harassmentType: HarassmentType | "";
  onAnswerChange: (value: HarassmentAnswer | "") => void;
  onTypeChange: (value: HarassmentType | "") => void;
  answerError?: string;
  typeError?: string;
};

export function HarassmentFacedFields({
  answer,
  harassmentType,
  onAnswerChange,
  onTypeChange,
  answerError,
  typeError,
}: HarassmentFacedFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Is harassment faced?</Label>
        <Select
          value={answer || undefined}
          onValueChange={(value) => {
            onAnswerChange(value as HarassmentAnswer);
            if (value === "no") onTypeChange("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {HARASSMENT_ANSWER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {answerError && <p className="text-sm text-destructive">{answerError}</p>}
      </div>

      {answer === "yes" && (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-4">
          <Label>Harassment type</Label>
          <Select
            value={harassmentType || undefined}
            onValueChange={(value) => onTypeChange(value as HarassmentType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {HARASSMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeError && <p className="text-sm text-destructive">{typeError}</p>}
        </div>
      )}
    </div>
  );
}

export type { HarassmentFacedValue };
