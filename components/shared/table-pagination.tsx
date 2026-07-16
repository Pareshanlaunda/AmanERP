"use client";

import { Button } from "@/components/ui/button";

type TablePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  /** e.g. "leads" or "matches" */
  noun?: string;
};

export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled = false,
  noun = "items",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {totalCount === 0 ? (
          `No ${noun}`
        ) : (
          <>
            Showing {from.toLocaleString()}–{to.toLocaleString()} of{" "}
            {totalCount.toLocaleString()} {noun}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </Button>
        <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
          Page {safePage} of {totalPages.toLocaleString()}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
