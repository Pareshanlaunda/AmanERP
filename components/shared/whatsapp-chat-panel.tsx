"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MessageCircle, RefreshCw, SendHorizontal, X, Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  getLeadWhatsAppConversation,
  listLeadWhatsAppTemplates,
  sendLeadWhatsAppMessage,
  sendLeadWhatsAppTemplate,
} from "@/lib/actions/whatsapp-chat";
import type { BotbizMessageTemplate } from "@/lib/botbiz/api-client";
import type { ParsedWhatsAppMessage } from "@/lib/botbiz/parse-conversation-message";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LIVE_POLL_MS = 4000;

function isOutside24HourWindowError(message: string): boolean {
  return /24\s*hour|template message/i.test(message);
}

function messageKey(message: ParsedWhatsAppMessage): string {
  return message.waMessageId || message.id;
}

function mergeConversation(
  previous: ParsedWhatsAppMessage[],
  incoming: ParsedWhatsAppMessage[]
): ParsedWhatsAppMessage[] {
  const byKey = new Map<string, ParsedWhatsAppMessage>();
  for (const message of previous) {
    // Keep in-flight optimistic sends until Botbiz returns the real row
    if (message.messageStatus === "sending" || message.id.startsWith("optimistic-")) {
      byKey.set(messageKey(message), message);
    }
  }
  for (const message of incoming) {
    byKey.set(messageKey(message), message);
  }
  return [...byKey.values()].sort((a, b) => {
    const left = a.conversationTime ?? "";
    const right = b.conversationTime ?? "";
    return left.localeCompare(right);
  });
}

function isNearBottom(el: HTMLDivElement, thresholdPx = 80): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
}

type WhatsAppChatPanelProps = {
  leadId: string;
  clientName?: string | null;
  clientPhone?: string | null;
  /** When false, panel is not rendered */
  enabled?: boolean;
};

function formatBubbleTime(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatDayDivider(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
  } catch {
    return "";
  }
}

function dayKey(value: string | null | undefined): string {
  if (!value) return "unknown";
  try {
    return new Date(value).toDateString();
  } catch {
    return "unknown";
  }
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? "C").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function roleHint(message: ParsedWhatsAppMessage): string | null {
  if (message.role === "bot") return "Bot";
  if (message.role === "agent" && message.agentName && message.agentName !== "You") {
    return message.agentName;
  }
  return null;
}

function MessageBubble({ message }: { message: ParsedWhatsAppMessage }) {
  const isOutbound = message.role === "bot" || message.role === "agent";
  const hint = roleHint(message);
  const time = formatBubbleTime(message.conversationTime);

  return (
    <div className={cn("flex w-full", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "wa-bubble relative max-w-[min(85%,22rem)] px-3 pb-1.5 pt-2 text-[0.9375rem] leading-snug shadow-sm",
          isOutbound ? "wa-bubble-out" : "wa-bubble-in"
        )}
      >
        {hint && (
          <p className="mb-0.5 text-[0.6875rem] font-semibold tracking-wide text-primary">
            {hint}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-foreground">{message.text}</p>
        {message.mediaUrl && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            <Paperclip className="h-3 w-3" />
            Open {message.mediaKind ?? "attachment"}
          </a>
        )}
        <div className="mt-1 flex items-center justify-end gap-1.5">
          {message.messageStatus === "sending" && (
            <span className="text-[0.625rem] text-muted-foreground">Sending…</span>
          )}
          {time && (
            <time className="font-mono text-[0.625rem] tabular-nums text-muted-foreground">
              {time}
            </time>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatsAppChatPanel({
  leadId,
  clientName,
  clientPhone,
  enabled = true,
}: WhatsAppChatPanelProps) {
  const titleId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ParsedWhatsAppMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [needsTemplate, setNeedsTemplate] = useState(false);
  const [templates, setTemplates] = useState<BotbizMessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadedForOpen = useRef(false);
  const pollInFlight = useRef(false);

  const displayName = clientName?.trim() || "WhatsApp chat";
  const displayPhone = clientPhone?.trim() || null;

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const applyConversation = useCallback(
    (incoming: ParsedWhatsAppMessage[], opts?: { forceScroll?: boolean }) => {
      const el = listRef.current;
      const shouldStick = opts?.forceScroll || (el ? isNearBottom(el) : true);
      setMessages((prev) => mergeConversation(prev, incoming));
      if (shouldStick) {
        requestAnimationFrame(scrollToBottom);
      }
    },
    [scrollToBottom]
  );

  const loadFullHistory = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (silent) {
        if (pollInFlight.current) return;
        pollInFlight.current = true;
      } else {
        setIsLoading(true);
        setLoadError(null);
      }

      const result = await getLeadWhatsAppConversation(leadId);

      if (silent) {
        pollInFlight.current = false;
      } else {
        setIsLoading(false);
      }

      if (!result.success) {
        if (!silent) {
          setLoadError(result.error);
          setMessages([]);
        }
        return;
      }

      if (silent) {
        applyConversation(result.data.messages);
        return;
      }

      setMessages(result.data.messages);
      requestAnimationFrame(scrollToBottom);
    },
    [leadId, applyConversation, scrollToBottom]
  );

  const loadTemplates = useCallback(async () => {
    setTemplatesError(null);
    const result = await listLeadWhatsAppTemplates(leadId);
    if (!result.success) {
      setTemplates([]);
      setTemplatesError(result.error);
      return;
    }
    setTemplates(result.data.templates);
    setSelectedTemplateId((prev) => {
      if (prev && result.data.templates.some((t) => t.id === prev)) return prev;
      return result.data.templates[0]?.id ?? "";
    });
  }, [leadId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (window.location.hash === "#whatsapp-chat") {
      setDrawerOpen(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!drawerOpen) {
      loadedForOpen.current = false;
      setNeedsTemplate(false);
      return;
    }
    if (loadedForOpen.current) return;
    loadedForOpen.current = true;
    void loadFullHistory();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [drawerOpen, loadFullHistory]);

  useEffect(() => {
    if (!drawerOpen || !needsTemplate) return;
    void loadTemplates();
  }, [drawerOpen, needsTemplate, loadTemplates]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Live sync: Botbiz has no per-message push webhook for LiveChat, so poll while open.
  useEffect(() => {
    if (!drawerOpen || !enabled) return;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void loadFullHistory({ silent: true });
    };

    const intervalId = window.setInterval(tick, LIVE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [drawerOpen, enabled, loadFullHistory]);

  if (!enabled) return null;

  function handleRefresh() {
    loadedForOpen.current = true;
    void loadFullHistory({ silent: false });
  }

  function sendDraft() {
    const text = draft.trim();
    if (!text || isPending) return;

    const optimistic: ParsedWhatsAppMessage = {
      id: `optimistic-${Date.now()}`,
      role: "agent",
      agentName: "You",
      text,
      mediaUrl: null,
      mediaKind: null,
      conversationTime: new Date().toISOString(),
      waMessageId: null,
      messageStatus: "sending",
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    requestAnimationFrame(scrollToBottom);

    startTransition(async () => {
      const result = await sendLeadWhatsAppMessage(leadId, text);
      if (!result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        toast.error(result.error);
        if (isOutside24HourWindowError(result.error)) {
          setNeedsTemplate(true);
        }
        return;
      }

      setNeedsTemplate(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? {
                ...m,
                id: result.data.waMessageId ?? m.id,
                waMessageId: result.data.waMessageId ?? null,
                conversationTime: result.data.sentAt,
                messageStatus: "sent",
              }
            : m
        )
      );
      toast.success("Message sent");
      void loadFullHistory({ silent: true });
    });
  }

  function sendTemplate() {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template || isPending) return;

    const optimistic: ParsedWhatsAppMessage = {
      id: `optimistic-template-${Date.now()}`,
      role: "agent",
      agentName: "You",
      text: `Template: ${template.name}`,
      mediaUrl: null,
      mediaKind: null,
      conversationTime: new Date().toISOString(),
      waMessageId: null,
      messageStatus: "sending",
    };

    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(scrollToBottom);

    startTransition(async () => {
      const result = await sendLeadWhatsAppTemplate(leadId, {
        id: template.id,
        name: template.name,
      });
      if (!result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error(result.error);
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? {
                ...m,
                id: result.data.waMessageId ?? m.id,
                waMessageId: result.data.waMessageId ?? null,
                conversationTime: result.data.sentAt,
                messageStatus: "sent",
                text: template.body?.trim() || `Template: ${template.name}`,
              }
            : m
        )
      );
      toast.success("Template sent");
      void loadFullHistory({ silent: true });
    });
  }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendDraft();
    }
  }

  const thread = messages.flatMap((message, index) => {
    const prev = messages[index - 1];
    const showDay = !prev || dayKey(prev.conversationTime) !== dayKey(message.conversationTime);
    const day = formatDayDivider(message.conversationTime);
    const nodes: ReactNode[] = [];
    if (showDay && day) {
      nodes.push(
        <div key={`day-${dayKey(message.conversationTime)}`} className="flex justify-center py-2">
          <span className="rounded-full bg-card/90 px-3 py-1 text-[0.6875rem] font-medium text-muted-foreground shadow-sm ring-1 ring-border/60">
            {day}
          </span>
        </div>
      );
    }
    nodes.push(<MessageBubble key={message.id} message={message} />);
    return nodes;
  });

  const drawer =
    mounted &&
    createPortal(
      <div
        className={cn(
          "fixed inset-0 z-50 flex justify-end",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-foreground/25 backdrop-blur-[2px] transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "opacity-0"
          )}
          aria-label="Close chat"
          tabIndex={drawerOpen ? 0 : -1}
          onClick={() => setDrawerOpen(false)}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "wa-drawer relative flex h-full w-full max-w-md flex-col bg-card shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none",
            drawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary"
              aria-hidden
            >
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate font-display text-base font-semibold tracking-tight">
                {displayName}
              </h2>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {displayPhone ?? "Full chat history"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={handleRefresh}
              disabled={isLoading || isPending}
              aria-label="Refresh conversation"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div ref={listRef} className="wa-thread relative min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
            {loadError && (
              <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {loadError}
              </div>
            )}

            {isLoading && messages.length === 0 ? (
              <div className="flex h-full min-h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading full conversation…</p>
              </div>
            ) : messages.length === 0 && !loadError ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No messages yet. Send the first reply below.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">{thread}</div>
            )}
          </div>

          <footer className="shrink-0 border-t border-border bg-card px-3 py-3 sm:px-4">
            {needsTemplate && (
              <div className="mb-3 space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs text-foreground">
                  Free text is blocked — this customer last messaged more than 24 hours ago.
                  Send an approved WhatsApp template instead.
                </p>
                {templatesError ? (
                  <p className="text-xs text-destructive">{templatesError}</p>
                ) : (
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    disabled={isPending || templates.length === 0}
                  >
                    {templates.length === 0 ? (
                      <option value="">Loading templates…</option>
                    ) : (
                      templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                          {template.status ? ` (${template.status})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                )}
                {selectedTemplateId && (
                  <p className="line-clamp-3 text-[0.6875rem] text-muted-foreground">
                    {templates.find((t) => t.id === selectedTemplateId)?.body ?? ""}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={isPending || !selectedTemplateId}
                  onClick={sendTemplate}
                >
                  {isPending ? "Sending template…" : "Send template"}
                </Button>
              </div>
            )}

            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendDraft();
              }}
            >
              <label className="sr-only" htmlFor={`wa-draft-${leadId}`}>
                Message
              </label>
              <textarea
                ref={inputRef}
                id={`wa-draft-${leadId}`}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                disabled={isPending}
                placeholder={needsTemplate ? "Free text blocked — use a template above" : "Type a message"}
                className="max-h-28 min-h-11 flex-1 resize-none rounded-[1.25rem] border border-input bg-muted/40 px-4 py-2.5 text-sm outline-none ring-ring transition-[box-shadow] placeholder:text-muted-foreground focus-visible:ring-2 disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isPending || isLoading || !draft.trim()}
                className="h-11 w-11 shrink-0 rounded-full p-0"
                aria-label="Send"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-2 text-center text-[0.6875rem] text-muted-foreground">
              Live while open · free text within 24h of their last message · otherwise use a template
            </p>
          </footer>
        </aside>
      </div>,
      document.body
    );

  return (
    <>
      <section id="whatsapp-chat" className="erp-panel scroll-mt-24 overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="section-title text-base sm:text-lg">WhatsApp</h2>
              <p className="truncate text-sm text-muted-foreground">
                Full chat history
                {displayName ? ` · ${displayName}` : ""}
                {displayPhone ? ` · ${displayPhone}` : ""}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-full sm:w-auto"
          >
            Open chat
          </Button>
        </div>
        {messages.length > 0 && (
          <p className="border-t border-border/70 px-4 py-2 text-xs text-muted-foreground sm:px-6">
            Last synced {formatDate(messages[messages.length - 1]?.conversationTime)}
          </p>
        )}
      </section>
      {drawer}
    </>
  );
}
