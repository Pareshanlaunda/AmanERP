import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types/database";

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700",
  assigned:
    "bg-sky-50 text-sky-800 border border-sky-100 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-900",
  in_progress:
    "bg-amber-50 text-amber-900 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900",
  successful:
    "bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900",
  converted:
    "bg-teal-50 text-teal-800 border border-teal-100 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-900",
  lost: "bg-rose-50 text-rose-800 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium sm:text-sm",
        statusStyles[status]
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
