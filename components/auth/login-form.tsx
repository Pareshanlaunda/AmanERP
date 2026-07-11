"use client";

import { useState, useTransition } from "react";
import { signIn } from "@/lib/actions/auth";
import { BRAND_NAME, BRAND_SHORT } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    startTransition(async () => {
      try {
        const result = await signIn(email, password);
        if (result && !result.success) {
          setError(result.error);
        }
      } catch (err) {
        const digest =
          typeof err === "object" && err && "digest" in err
            ? String((err as { digest?: string }).digest)
            : "";
        if (digest.startsWith("NEXT_REDIRECT")) throw err;

        const message = err instanceof Error ? err.message : "Sign in failed";
        setError(
          /failed to fetch|networkerror|load failed/i.test(message)
            ? "Cannot reach the server. Confirm npm run dev is running on http://localhost:3000, hard-refresh, and try again."
            : message
        );
      }
    });
  }

  return (
    <div className="erp-panel w-full max-w-md overflow-hidden p-0 shadow-lg">
      <div className="border-b border-border/70 bg-accent/40 px-6 py-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {BRAND_SHORT}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access {BRAND_NAME} leads, clients, and onboarding
        </p>
      </div>
      <div className="px-6 py-6">
        <form action={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error ? (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
