"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { deactivateEmployee } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";

type Props = {
  employeeId: string;
  employeeName: string;
  activeLeadCount: number;
  isActive: boolean;
};

export function RemoveEmployeeButton({
  employeeId,
  employeeName,
  activeLeadCount,
  isActive,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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

  if (!isActive) return null;

  function close() {
    setOpen(false);
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await deactivateEmployee({ employee_id: employeeId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${employeeName} removed from the team`);
      close();
      router.push("/admin/dashboard");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <UserMinus className="h-3.5 w-3.5" />
        Remove employee
      </Button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="remove-employee-title"
                className="w-full max-w-md rounded-xl border bg-background p-5 shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 id="remove-employee-title" className="text-base font-semibold">
                      Remove employee
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Remove{" "}
                      <span className="font-medium text-foreground">{employeeName}</span> from the
                      team? They will lose login access. Past leads, comments, and clients stay in
                      the system for audit history.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={close}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>

                {activeLeadCount > 0 ? (
                  <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                    Reassign {activeLeadCount} primary active lead{activeLeadCount === 1 ? "" : "s"}{" "}
                    in the panel above first.
                  </p>
                ) : null}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleConfirm}
                    disabled={isPending || activeLeadCount > 0}
                  >
                    {isPending ? "Removing…" : "Remove employee"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
