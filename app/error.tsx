"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AuthThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <AuthThemeToggle />
      <h1 className="section-title">Something went wrong</h1>
      <p className="section-subtitle mt-2 max-w-md">
        An unexpected error occurred. You can try again or return to the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
