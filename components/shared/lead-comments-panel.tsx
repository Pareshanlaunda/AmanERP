"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { addLeadComment, markCommentsRead } from "@/lib/actions/comments";
import type { LeadComment } from "@/lib/types/database";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LeadCommentsPanelProps = {
  leadId: string;
  comments: LeadComment[];
  hasUnread: boolean;
  authorNames?: Record<string, string>;
};

export function LeadCommentsPanel({
  leadId,
  comments,
  hasUnread,
  authorNames = {},
}: LeadCommentsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);

  function handleOpen() {
    if (!open) setOpen(true);
    if (hasUnread) {
      startTransition(async () => {
        await markCommentsRead(leadId);
        router.refresh();
      });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = new FormData(e.currentTarget).get("message") as string;

    startTransition(async () => {
      const result = await addLeadComment(leadId, message);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Comment added");
      e.currentTarget.reset();
      router.refresh();
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
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
            )}
          </span>
          Discussion
          {hasUnread && <span className="text-xs font-normal text-red-600">New</span>}
        </h2>
      </div>
      {open && (
        <div className="space-y-4 p-4 sm:p-6">
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet. Start the discussion.</p>
            ) : (
              comments.map((comment) => (
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
