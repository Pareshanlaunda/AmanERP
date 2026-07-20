/** Client-side helpers for notice file download / view. */

async function fetchNoticeBlob(
  noticeId: string,
  format: "docx" | "pdf" | "xlsx",
  inline = false
): Promise<{ blob: Blob; filename: string }> {
  const qs = new URLSearchParams({ format });
  if (inline) qs.set("inline", "1");

  const res = await fetch(`/api/notices/${noticeId}/download?${qs}`, {
    method: "GET",
    credentials: "same-origin",
  });

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  if (!blob.size) {
    throw new Error("Downloaded file is empty");
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disposition);
  const fallback = `notice.${format}`;
  const filename = match?.[1] ? decodeURIComponent(match[1]) : fallback;

  return { blob, filename };
}

export async function downloadNoticeFile(
  noticeId: string,
  format: "docx" | "pdf" | "xlsx" = "docx"
): Promise<void> {
  const { blob, filename } = await fetchNoticeBlob(noticeId, format);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Open PDF in a new tab (top-level navigation — native browser viewer).
 * Avoids iframe/blob CSP + X-Frame-Options blocks ("site blocked / contact owner").
 */
export async function viewNoticeInNewTab(noticeId: string): Promise<void> {
  const opened = window.open(
    `/api/notices/${noticeId}/download?format=pdf&inline=1`,
    "_blank",
    "noopener,noreferrer"
  );
  if (!opened) {
    // Popup blocked — same-tab fallback
    window.location.assign(
      `/api/notices/${noticeId}/download?format=pdf&inline=1`
    );
  }
}
