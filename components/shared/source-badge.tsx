import { cn } from "@/lib/utils";
import { getLeadSourceLabel } from "@/lib/types/database";

export function SourceBadge({ source }: { source?: string | null }) {
  if (!source) {
    return <span className="text-muted-foreground">—</span>;
  }

  const label = getLeadSourceLabel(source);
  const isWhatsApp = source === "whatsapp";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium sm:text-sm",
        isWhatsApp
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-border bg-muted/40 text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
