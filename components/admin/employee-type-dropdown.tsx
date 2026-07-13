"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { EmployeeType } from "@/lib/types/database";
import { EMPLOYEE_TYPE_FORM_OPTIONS } from "@/lib/validations/users";
import { cn } from "@/lib/utils";

type EmployeeTypeDropdownProps = {
  value: EmployeeType;
  onChange: (value: EmployeeType) => void;
};

/**
 * In-flow dropdown (not portaled). Card grows with the open list so every
 * option stays fully visible — no inner scroll, no viewport clip.
 * On open, page smooth-scrolls so the full menu is on screen.
 */
export function EmployeeTypeDropdown({ value, onChange }: EmployeeTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = EMPLOYEE_TYPE_FORM_OPTIONS.find((option) => option.value === value);

  useLayoutEffect(() => {
    if (!open) return;

    // Wait one frame so the list is laid out, then one scroll — margin on
    // the Create user button (scroll-mb-*) provides bottom breathing room.
    const frame = requestAnimationFrame(() => {
      const card = rootRef.current?.closest("section");
      const submit = rootRef.current
        ?.closest("form")
        ?.querySelector<HTMLElement>('button[type="submit"]');

      (submit ?? card ?? rootRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="w-full scroll-mb-10">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="line-clamp-1 text-left">
          {selected?.label ?? "Select employee type"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="mt-1 w-full rounded-md border bg-card p-1 text-card-foreground shadow-md"
        >
          {EMPLOYEE_TYPE_FORM_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={cn(
                    "relative flex w-full items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {isSelected ? (
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
