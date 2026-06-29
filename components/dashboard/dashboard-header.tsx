"use client";

import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

type DashboardHeaderProps = {
  userEmail: string;
};

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex flex-col gap-4 border-b bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">AMAN Client Onboarding</h1>
        <p className="text-sm text-muted-foreground">{userEmail}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => router.push("/onboarding/new")}>
          <Plus className="h-4 w-4" />
          New Client Onboarding
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
