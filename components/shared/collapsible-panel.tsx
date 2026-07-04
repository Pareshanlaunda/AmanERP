"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { SearchBar } from "@/components/dashboard/search-bar";
import { cn } from "@/lib/utils";

type CollapsiblePanelSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type CollapsiblePanelProps = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  search?: CollapsiblePanelSearch;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CollapsiblePanel({
  title,
  subtitle,
  defaultOpen = true,
  search,
  headerActions,
  children,
  className,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("erp-panel overflow-hidden", className)}>
      <div className="flex items-stretch border-b border-border/70 bg-accent/30">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start justify-between gap-3 px-4 py-4 text-left sm:px-6"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <div className="min-w-0">
            <h2 className="section-title">{title}</h2>
            {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
          </div>
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
        {headerActions ? (
          <div
            className="flex shrink-0 items-center border-l border-border/60 px-4 py-4 sm:px-6"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {headerActions}
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="p-4 sm:p-6">
          {search ? (
            <SearchBar
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder}
              className="mb-4 max-w-none"
            />
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}
