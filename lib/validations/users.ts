import { z } from "zod";
import { employeeTypeSchema } from "@/lib/validations/leads";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(
    (val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val),
    "Password must contain at least one letter and one number"
  );

export const createUserSchema = z
  .object({
    // Unique identity is email (Auth). Same full_name / role allowed for different emails.
    email: z
      .string()
      .trim()
      .email("Valid email is required")
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: passwordSchema,
    full_name: z.string().min(1, "Name is required"),
    role: z.enum(["admin", "employee"]),
    employee_type: employeeTypeSchema.optional(),
    address: z.string().min(1, "Address is required"),
    mobile: z
      .string()
      .min(8, "Mobile number is required")
      .regex(/^[+\d][\d\s-]{7,18}$/, "Enter a valid mobile number"),
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

/** Admin sets a new password directly — no old password / email link. */
export const adminResetPasswordSchema = z.object({
  user_id: z.string().uuid("Invalid user"),
  password: passwordSchema,
});

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

export const deactivateEmployeeSchema = z.object({
  employee_id: z.string().uuid("Invalid employee"),
});

export type DeactivateEmployeeInput = z.infer<typeof deactivateEmployeeSchema>;

/** Same id field as deactivate — admin restores team access. */
export const reactivateEmployeeSchema = deactivateEmployeeSchema;

export type ReactivateEmployeeInput = z.infer<typeof reactivateEmployeeSchema>;

export const EMPLOYEE_TYPE_FORM_OPTIONS = [
  { value: "advocate", label: "Advocate" },
  { value: "csa", label: "CSA" },
  { value: "hr", label: "HR" },
  { value: "director", label: "Director" },
  { value: "finance", label: "Finance" },
  { value: "general", label: "Employee (General)" },
] as const;
