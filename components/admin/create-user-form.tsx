"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUser } from "@/lib/actions/users";
import type { UserRole, EmployeeType } from "@/lib/types/database";
import { EmployeeTypeDropdown } from "@/components/admin/employee-type-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CreateUserFormProps = {
  defaultRole?: UserRole;
};

export function CreateUserForm({ defaultRole = "employee" }: CreateUserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [employeeType, setEmployeeType] = useState<EmployeeType>("general");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const payload = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        full_name: formData.get("full_name") as string,
        address: formData.get("address") as string,
        mobile: formData.get("mobile") as string,
        role,
        employee_type: role === "admin" ? undefined : employeeType,
      };

      const result = await createUser(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("User created");
      router.push("/admin/users");
    });
  }

  return (
    <section className="erp-panel">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">Create user</h2>
        <p className="section-subtitle">
          Add a new admin or employee with email and password.
        </p>
      </div>
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" name="full_name" required placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="user@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">
              Mobile number<span className="text-destructive">*</span>
            </Label>
            <Input
              id="mobile"
              name="mobile"
              type="tel"
              required
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">
              Office address<span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              name="address"
              required
              placeholder="e.g. Delhi NCR Office: B-33, Sector-2, Noida, Uttar Pradesh"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={8}
              placeholder="Min 8 characters, letter + number"
            />
          </div>
          <div className="space-y-2">
            <Label>Access role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "employee" && (
            <div className="space-y-2">
              <Label>Employee type</Label>
              <EmployeeTypeDropdown value={employeeType} onChange={setEmployeeType} />
            </div>
          )}
          <Button type="submit" disabled={isPending} className="w-full scroll-mb-24 sm:w-auto sm:scroll-mb-28">
            {isPending ? "Creating..." : "Create user"}
          </Button>
        </form>
      </div>
    </section>
  );
}
