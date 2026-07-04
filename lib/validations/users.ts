import { z } from "zod";
import { employeeTypeSchema } from "@/lib/validations/leads";

export const createUserSchema = z
  .object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    full_name: z.string().min(1, "Name is required"),
    role: z.enum(["admin", "employee"]),
    employee_type: employeeTypeSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "employee" && !data.employee_type) {
      ctx.addIssue({
        code: "custom",
        message: "Employee type is required",
        path: ["employee_type"],
      });
    }
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const EMPLOYEE_TYPE_FORM_OPTIONS = [
  { value: "advocate", label: "Advocate" },
  { value: "csa", label: "CSA" },
  { value: "hr", label: "HR" },
  { value: "director", label: "Director" },
  { value: "finance", label: "Finance" },
  { value: "general", label: "Employee (General)" },
] as const;
