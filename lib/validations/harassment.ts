import { z } from "zod";

export const harassmentAnswerSchema = z.enum(["yes", "no"]);
export const harassmentTypeSchema = z.enum(["calls", "home_visit", "calls_and_home_visit"]);

export const harassmentFacedSchema = z.enum([
  "no",
  "yes_calls",
  "yes_home_visit",
  "yes_calls_home_visit",
]);

export type HarassmentAnswer = z.infer<typeof harassmentAnswerSchema>;
export type HarassmentType = z.infer<typeof harassmentTypeSchema>;
export type HarassmentFacedValue = z.infer<typeof harassmentFacedSchema>;

export const HARASSMENT_ANSWER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export const HARASSMENT_TYPE_OPTIONS = [
  { value: "calls", label: "Calls" },
  { value: "home_visit", label: "Home Visit" },
  { value: "calls_and_home_visit", label: "Calls & Home Visit" },
] as const;

export const HARASSMENT_FACED_LABELS: Record<HarassmentFacedValue, string> = {
  no: "No",
  yes_calls: "Yes — Calls",
  yes_home_visit: "Yes — Home Visit",
  yes_calls_home_visit: "Yes — Calls & Home Visit",
};

export function encodeHarassmentFaced(
  answer?: HarassmentAnswer | "",
  type?: HarassmentType | ""
): HarassmentFacedValue | undefined {
  if (!answer) return undefined;
  if (answer === "no") return "no";
  if (!type) return undefined;
  if (type === "calls") return "yes_calls";
  if (type === "home_visit") return "yes_home_visit";
  return "yes_calls_home_visit";
}

export function decodeHarassmentFaced(value?: HarassmentFacedValue | null) {
  if (!value || value === "no") {
    return { answer: value === "no" ? ("no" as const) : ("" as const), type: "" as const };
  }
  if (value === "yes_calls") return { answer: "yes" as const, type: "calls" as const };
  if (value === "yes_home_visit") return { answer: "yes" as const, type: "home_visit" as const };
  return { answer: "yes" as const, type: "calls_and_home_visit" as const };
}

export const harassmentFormSchema = z
  .object({
    harassment_answer: harassmentAnswerSchema.optional(),
    harassment_type: harassmentTypeSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.harassment_answer === "yes" && !data.harassment_type) {
      ctx.addIssue({
        code: "custom",
        message: "Select calls or home visit",
        path: ["harassment_type"],
      });
    }
  });
