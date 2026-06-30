"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createFirstAdmin, createUser } from "@/lib/actions/users";
import type { UserRole } from "@/lib/types/database";
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
  mode?: "admin" | "setup";
  defaultRole?: UserRole;
};

export function CreateUserForm({ mode = "admin", defaultRole = "employee" }: CreateUserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>(defaultRole);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const payload = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        full_name: formData.get("full_name") as string,
        role: mode === "setup" ? ("admin" as const) : role,
      };

      const result =
        mode === "setup" ? await createFirstAdmin(payload) : await createUser(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "setup" ? "Admin account created. You can sign in now." : "User created");
      if (mode === "setup") {
        router.push("/login");
      } else {
        form.reset();
        setRole(defaultRole);
        router.refresh();
      }
    });
  }

  return (
    <section className="erp-panel overflow-hidden">
      <div className="border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6">
        <h2 className="section-title">
          {mode === "setup" ? "Create first admin" : "Create user"}
        </h2>
        <p className="section-subtitle">
          {mode === "setup"
            ? "One-time setup — creates the first admin account for this app."
            : "Add a new admin or employee with email and password."}
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
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={6}
              placeholder="Min 6 characters"
            />
          </div>
          {mode === "admin" && (
            <div className="space-y-2">
              <Label>Role</Label>
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
          )}
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Creating..." : mode === "setup" ? "Create admin & go to login" : "Create user"}
          </Button>
        </form>
      </div>
    </section>
  );
}
