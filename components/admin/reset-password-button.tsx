"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { adminResetUserPassword } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

type Props = {
  userId: string;
  userName: string;
};

export function ResetPasswordButton({ userId, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setPassword("");
    setConfirm("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await adminResetUserPassword({
        user_id: userId,
        password,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Password updated for ${userName}`);
      close();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Reset password
      </Button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="reset-password-title"
                className="w-full max-w-md rounded-xl border bg-background p-5 shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 id="reset-password-title" className="text-base font-semibold">
                      Reset password
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Set a new password for <span className="font-medium text-foreground">{userName}</span>.
                      They can sign in with it immediately.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={close}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`new-password-${userId}`}>New password</Label>
                    <PasswordInput
                      id={`new-password-${userId}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      placeholder="Min 8 chars, letter + number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`confirm-password-${userId}`}>Confirm password</Label>
                    <PasswordInput
                      id={`confirm-password-${userId}`}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      placeholder="Re-enter password"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? "Saving…" : "Set password"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
