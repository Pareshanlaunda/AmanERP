import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { BRAND_SHORT } from "@/lib/brand";
import type { Notification } from "@/lib/types/database";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  title: string;
  subtitle: string;
  userId?: string;
  actions?: React.ReactNode;
  notifications?: Notification[];
  leadLinkPrefix?: string;
};

export function AppHeader({
  title,
  subtitle,
  userId,
  actions,
  notifications,
  leadLinkPrefix,
}: AppHeaderProps) {
  const showNotifications = userId && notifications && leadLinkPrefix;

  return (
    <header className="erp-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="page-container flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
            {BRAND_SHORT}
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
          {actions}
          <ThemeToggle />
          {showNotifications && (
            <NotificationBell
              userId={userId}
              initialNotifications={notifications}
              leadLinkPrefix={leadLinkPrefix}
            />
          )}
          <form action={signOut}>
            <Button type="submit" variant="outline" className="h-11 px-3 sm:px-4">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="secondary" className="w-full sm:w-auto">
      <Link href={href}>{children}</Link>
    </Button>
  );
}
