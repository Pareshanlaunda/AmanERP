"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageTabItem = {
  id: string;
  label: string;
  number: number;
  hidden?: boolean;
};

const HASH_TO_TAB: Record<string, string> = {
  "whatsapp-chat": "whatsapp",
};

function tabIdFromHash(hash: string, visibleIds: Set<string>): string | null {
  const raw = hash.replace(/^#/, "");
  if (!raw) return null;
  const tabId = HASH_TO_TAB[raw] ?? raw;
  return visibleIds.has(tabId) ? tabId : null;
}

type PageTabsProps = {
  tabs: PageTabItem[];
  defaultTabId?: string;
  children: (activeTabId: string) => ReactNode;
};

export function PageTabs({ tabs, defaultTabId, children }: PageTabsProps) {
  const visibleTabs = useMemo(() => tabs.filter((tab) => !tab.hidden), [tabs]);
  const visibleIds = useMemo(() => new Set(visibleTabs.map((tab) => tab.id)), [visibleTabs]);

  const [activeId, setActiveId] = useState(
    defaultTabId && visibleIds.has(defaultTabId)
      ? defaultTabId
      : (visibleTabs[0]?.id ?? "")
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const fromHash = tabIdFromHash(window.location.hash, visibleIds);
      if (fromHash) setActiveId(fromHash);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [visibleIds]);

  function selectTab(id: string) {
    setActiveId(id);
    if (typeof window === "undefined") return;
    const hash = id === "whatsapp" ? "whatsapp-chat" : id;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${hash}`
    );
  }

  if (visibleTabs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Lead sections"
        className="flex flex-wrap gap-2 border-b border-border/70 pb-3"
      >
        {visibleTabs.map((tab) => {
          const selected = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`lead-tabpanel-${tab.id}`}
              id={`lead-tab-${tab.id}`}
              onClick={() => selectTab(tab.id)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.number}. {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`lead-tabpanel-${activeId}`}
        aria-labelledby={`lead-tab-${activeId}`}
      >
        {children(activeId)}
      </div>
    </div>
  );
}
