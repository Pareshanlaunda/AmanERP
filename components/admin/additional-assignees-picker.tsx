"use client";

import { formatEmployeeOptionLabel } from "@/lib/labels/employees";
import type { Profile } from "@/lib/types/database";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AdditionalAssigneesPickerProps = {
  employees: (Profile & { email?: string })[];
  /** Primary assignee — excluded from the list and cannot be selected here. */
  primaryId?: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  id?: string;
};

export function AdditionalAssigneesPicker({
  employees,
  primaryId,
  selectedIds,
  onChange,
  disabled,
  id = "additional_assignees",
}: AdditionalAssigneesPickerProps) {
  const options = employees.filter((e) => e.id !== primaryId);

  function toggle(employeeId: string) {
    if (selectedIds.includes(employeeId)) {
      onChange(selectedIds.filter((id) => id !== employeeId));
    } else {
      onChange([...selectedIds, employeeId]);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Additional employees (optional)</Label>
      <p className="text-xs text-muted-foreground">
        Co-assignees can view and work this lead. You can change the list anytime (add or remove).
        Primary assignee stays required above.
      </p>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {primaryId ? "No other employees available." : "No employees yet."}
        </p>
      ) : (
        <div
          id={id}
          className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/70 bg-background p-2"
          role="group"
          aria-label="Additional employees"
        >
          {options.map((employee) => {
            const checked = selectedIds.includes(employee.id);
            return (
              <label
                key={employee.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60",
                  checked && "bg-muted/40",
                  disabled && "pointer-events-none opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(employee.id)}
                />
                <span>{formatEmployeeOptionLabel(employee)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
