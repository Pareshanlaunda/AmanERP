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
    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");
    if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
      setError("Invalid email or password");
      return;
    }
    const email = emailRaw.trim().slice(0, 254);
    const password = passwordRaw.slice(0, 128);

    startTransition(async () => {
      try {
        const result = await signIn(email, password);
        if (!result) {
          setError("Sign in failed. Try again.");
          return;
        }
        if (!result.success) {
          setError(result.error);
          return;
        }
        // Only allow same-origin dashboard paths from the server allowlist.
        const path = result.redirectTo;
        if (path !== "/admin/dashboard" && path !== "/employee/dashboard") {
          setError("Sign in failed. Try again.");
          return;
        }
        // Full navigation so session cookies from the action are always sent.
        window.location.assign(path);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed";
        if (/server action|was not found on the server/i.test(message)) {
          setError(
            "This page is out of date after a deploy. Hard-refresh (Ctrl+Shift+R) and try again."
          );
          return;
        }
        // Never surface raw Error.message (can leak stack/env details).
        setError(
          /failed to fetch|networkerror|load failed/i.test(message)
            ? "Cannot reach the server. Check your connection and try again."
            : "Sign in failed. Try again."
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
              maxLength={254}
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
              maxLength={128}
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
