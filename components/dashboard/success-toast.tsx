"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function SuccessToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Client onboarded successfully");
      window.history.replaceState({}, "", pathname);
    }
  }, [searchParams, pathname]);

  return null;
}
