import { cn } from "@/lib/utils";

export function CidBadge({
  clientId,
  className,
}: {
  clientId: string | null | undefined;
  className?: string;
}) {
  if (!clientId) return <span className="text-muted-foreground">—</span>;

  return (
    <span className={cn("cid-chip", className)} title="Client ID">
      {clientId}
    </span>
  );
}
