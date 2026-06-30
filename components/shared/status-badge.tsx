import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types/database";

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700 border border-slate-200",
  assigned: "bg-sky-50 text-sky-800 border border-sky-100",
  in_progress: "bg-amber-50 text-amber-900 border border-amber-100",
  successful: "bg-emerald-50 text-emerald-800 border border-emerald-100",
  converted: "bg-teal-50 text-teal-800 border border-teal-100",
  lost: "bg-rose-50 text-rose-800 border border-rose-100",
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
