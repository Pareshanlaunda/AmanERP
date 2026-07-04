import { cn } from "@/lib/utils";

export function ClidBadge({
  clientId,
  className,
}: {
  clientId: string | null | undefined;
  className?: string;
}) {
  if (!clientId) return <span className="text-muted-foreground">—</span>;

  return (
    <span className={cn("clid-chip", className)} title="Client List ID (CLID)">
      {clientId}
    </span>
  );
}

/** @deprecated Use ClidBadge */
export const CidBadge = ClidBadge;
