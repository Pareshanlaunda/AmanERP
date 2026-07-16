"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { reactivateEmployee } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";

type Props = {
  employeeId: string;
  employeeName: string;
  isActive: boolean;
};

export function ReactivateEmployeeButton({ employeeId, employeeName, isActive }: Props) {
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

  if (isActive) return null;

  function close() {
    setOpen(false);
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await reactivateEmployee({ employee_id: employeeId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${employeeName} reactivated — they can sign in again`);
      close();
      router.refresh();
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
        <UserPlus className="h-3.5 w-3.5" />
        Reactivate employee
      </Button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="reactivate-employee-title"
                className="w-full max-w-md rounded-xl border bg-background p-5 shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 id="reactivate-employee-title" className="text-base font-semibold">
                      Reactivate employee
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Restore{" "}
                      <span className="font-medium text-foreground">{employeeName}</span> to the
                      active team? They will be able to sign in again and appear in assignment
                      lists. Past work history is unchanged.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={close}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleConfirm} disabled={isPending}>
                    {isPending ? "Reactivating…" : "Reactivate employee"}
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
