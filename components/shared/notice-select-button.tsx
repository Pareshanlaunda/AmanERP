"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReplyNoticeModal } from "@/components/shared/reply-notice-modal";
import {
  downloadNoticeFile,
  viewNoticeInNewTab,
} from "@/lib/notices/browser-files";
import type { ClientOnboarding } from "@/lib/validations/onboarding";

type Props = {
  client: ClientOnboarding;
  /** Latest saved notice for this client (if any). */
  latestNoticeId?: string | null;
  onNoticeSaved?: (noticeId: string) => void;
};

export function NoticeSelectButton({
  client,
  latestNoticeId = null,
  onNoticeSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [noticeId, setNoticeId] = useState<string | null>(latestNoticeId);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setNoticeId(latestNoticeId);
  }, [latestNoticeId]);

  function handleSaved(id: string) {
    setNoticeId(id);
    onNoticeSaved?.(id);
  }

  async function handleDownload() {
    if (!noticeId) {
      toast.error("No saved notice yet — generate and save first");
      return;
    }
    setDownloading(true);
    try {
      await downloadNoticeFile(noticeId, "docx");
      toast.success("Download started");
    } catch (e) {
      console.error("[notice download]", e);
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function handleView() {
    if (!noticeId) {
      toast.error("No saved notice yet — generate and save first");
      return;
    }
    try {
      await viewNoticeInNewTab(noticeId);
    } catch (e) {
      console.error("[notice view]", e);
      toast.error(e instanceof Error ? e.message : "Unable to open notice");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setOpen(true)}
        >
          Generate
        </Button>
        {noticeId ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={handleView}
            >
              View
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={downloading}
              onClick={handleDownload}
            >
              {downloading ? "…" : "Download"}
            </Button>
          </>
        ) : null}
      </div>
      <ReplyNoticeModal
        client={client}
        open={open}
        onOpenChange={setOpen}
        onSaved={handleSaved}
      />
    </>
  );
}
