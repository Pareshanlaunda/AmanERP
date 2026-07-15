"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { addLeadComment, markCommentsRead } from "@/lib/actions/comments";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import type { LeadComment } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LeadCommentsPanelProps = {
  leadId: string;
  currentUserId: string;
  comments: LeadComment[];
  hasUnread: boolean;
  authorNames?: Record<string, string>;
};

export function LeadCommentsPanel({
  leadId,
  currentUserId,
  comments: initialComments,
  hasUnread: initialHasUnread,
  authorNames = {},
}: LeadCommentsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const [hasUnread, setHasUnread] = useState(initialHasUnread);
  const [optimisticComments, setOptimisticComments] = useState<LeadComment[]>([]);
  const pendingCommentIds = useRef(new Set<string>());

  const handleCommentRow = useCallback(
    (comment: LeadComment, event: "INSERT" | "UPDATE" | "DELETE") => {
      if (event === "INSERT") {
        pendingCommentIds.current.delete(comment.message);
        setOptimisticComments((prev) =>
          prev.filter((item) => item.message !== comment.message || item.author_id !== comment.author_id)
        );
        if (comment.author_id !== currentUserId) {
          setHasUnread(true);
        }
      }
    },
    [currentUserId]
  );

  const liveComments = useRealtimeRows({
    table: "lead_comments",
    initialRows: initialComments,
    channelName: `lead-comments:${leadId}`,
    filter: `lead_id=eq.${leadId}`,
    sortBy: "created_at",
    sortDescending: false,
    onRow: handleCommentRow,
  });

  const displayedComments = [...liveComments, ...optimisticComments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  function handleOpen() {
    if (!open) setOpen(true);
    if (hasUnread) {
      setHasUnread(false);
      startTransition(async () => {
        const result = await markCommentsRead(leadId);
        if (!result.success) {
          setHasUnread(true);
          toast.error(result.error);
        }
      });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const message = (new FormData(form).get("message") as string).trim();
    if (!message) return;

    const optimistic: LeadComment = {
      id: `optimistic-${Date.now()}`,
      lead_id: leadId,
      author_id: currentUserId,
      message,
      created_at: new Date().toISOString(),
    };

    pendingCommentIds.current.add(message);
    setOptimisticComments((prev) => [...prev, optimistic]);

    startTransition(async () => {
      const result = await addLeadComment(leadId, message);
      if (!result.success) {
        setOptimisticComments((prev) => prev.filter((item) => item.id !== optimistic.id));
        pendingCommentIds.current.delete(message);
        toast.error(result.error);
        return;
      }
      toast.success("Comment added");
      form.reset();
    });
  }

  return (
    <section className="erp-panel overflow-hidden">
      <div
        className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/70 bg-accent/30 px-4 py-4 sm:px-6"
        onClick={handleOpen}
      >
        <h2 className="section-title flex items-center gap-2 text-base sm:text-lg">
          <span className="relative">
            <MessageSquare className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card" />
            )}
          </span>
          Discussion
          {hasUnread && <span className="text-xs font-normal text-destructive">New</span>}
        </h2>
      </div>
      {open && (
        <div className="space-y-4 p-4 sm:p-6">
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {displayedComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet. Start the discussion.</p>
            ) : (
              displayedComments.map((comment) => (
                <div key={comment.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{authorNames[comment.author_id] ?? "User"}</span>
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="mt-2">{comment.message}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <Label htmlFor="comment-message">Add comment</Label>
            <Textarea
              id="comment-message"
              name="message"
              rows={3}
              required
              placeholder="Write a message for the team..."
            />
            <Button type="submit" size="sm" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Sending..." : "Send comment"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
