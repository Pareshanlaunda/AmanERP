"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { mergeLeadRealtimeRow } from "@/lib/leads/assignees";
import type { Lead } from "@/lib/types/database";

type LeadLiveContextValue = {
  lead: Lead;
  setLeadOptimistic: (patch: Partial<Lead>) => void;
};

const LeadLiveContext = createContext<LeadLiveContextValue | null>(null);

type LeadLiveProviderProps = {
  initialLead: Lead;
  children: ReactNode;
};

export function LeadLiveProvider({ initialLead, children }: LeadLiveProviderProps) {
  const [lead, setLead] = useState(initialLead);
  const initialLeadRef = useRef(initialLead);
  initialLeadRef.current = initialLead;

  useEffect(() => {
    setLead(initialLeadRef.current);
  }, [initialLead.id, initialLead.updated_at]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`lead-live:${initialLead.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `id=eq.${initialLead.id}`,
        },
        (payload) => {
          setLead((prev) => mergeLeadRealtimeRow(prev, payload.new as Lead));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [initialLead.id]);

  const setLeadOptimistic = useCallback((patch: Partial<Lead>) => {
    setLead((current) => ({ ...current, ...patch }));
  }, []);

  return (
    <LeadLiveContext.Provider value={{ lead, setLeadOptimistic }}>
      {children}
    </LeadLiveContext.Provider>
  );
}

export function useLeadLive() {
  const context = useContext(LeadLiveContext);
  if (!context) {
    throw new Error("useLeadLive must be used within LeadLiveProvider");
  }
  return context;
}

export function useLeadLiveOptional() {
  return useContext(LeadLiveContext);
}

/** Uses provider when present; otherwise falls back to a standalone subscription. */
export function useLeadLiveOrSubscribe(initialLead: Lead): LeadLiveContextValue {
  const context = useLeadLiveOptional();
  const [fallbackLead, setFallbackLead] = useState(initialLead);
  const initialLeadRef = useRef(initialLead);
  initialLeadRef.current = initialLead;

  useEffect(() => {
    setFallbackLead(initialLeadRef.current);
  }, [initialLead.id, initialLead.updated_at]);

  useEffect(() => {
    if (context) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`lead-fallback:${initialLead.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `id=eq.${initialLead.id}`,
        },
        (payload) => {
          setFallbackLead((prev) => mergeLeadRealtimeRow(prev, payload.new as Lead));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [context, initialLead.id]);

  const setLeadOptimistic = useCallback((patch: Partial<Lead>) => {
    if (context) {
      context.setLeadOptimistic(patch);
      return;
    }
    setFallbackLead((current) => ({ ...current, ...patch }));
  }, [context]);

  if (context) return context;

  return { lead: fallbackLead, setLeadOptimistic };
}
