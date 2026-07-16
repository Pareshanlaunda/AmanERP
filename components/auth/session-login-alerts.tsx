"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** One-shot login messages for session expiry / removed account (query stripped after show). */
export function SessionLoginAlerts() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const session = searchParams.get("session");
    const account = searchParams.get("account");
    if (!session && !account) return;

    if (session === "idle") {
      toast.message("You were signed out after a period of inactivity.");
    }
    if (account === "removed") {
      toast.message("This account is no longer active. Contact your admin.");
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("session");
    url.searchParams.delete("account");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [searchParams]);

  return null;
}
