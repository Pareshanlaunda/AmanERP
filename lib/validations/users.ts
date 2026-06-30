import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "employee"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
