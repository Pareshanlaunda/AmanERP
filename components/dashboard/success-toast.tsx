"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function SuccessToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Client onboarded successfully");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  return null;
}
