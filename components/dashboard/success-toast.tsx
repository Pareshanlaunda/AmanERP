"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function SuccessToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    let dirty = false;

    if (searchParams.get("advocateAssignFailed") === "1") {
      toast.warning(
        "Onboarding saved, but advocate was not assigned. Fix assignees on this lead."
      );
      dirty = true;
    }
    if (searchParams.get("auditTrailFailed") === "1") {
      toast.warning("Onboarding saved, but activity timeline note failed to write.");
      dirty = true;
    }
    if (searchParams.get("formSubmitted") === "1" && !dirty) {
      toast.success("Client onboarding form submitted");
      dirty = true;
    } else if (searchParams.get("formSubmitted") === "1") {
      dirty = true;
    }
    if (searchParams.get("success") === "1") {
      toast.success("Client onboarded successfully");
      dirty = true;
    }

    if (dirty) {
      window.history.replaceState({}, "", pathname);
    }
  }, [searchParams, pathname]);

  return null;
}
