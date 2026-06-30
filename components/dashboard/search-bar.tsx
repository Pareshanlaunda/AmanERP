"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder = "Search by client name...",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative w-full max-w-xl", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 pl-10 text-base"
        aria-label="Search"
      />
    </div>
  );
}
