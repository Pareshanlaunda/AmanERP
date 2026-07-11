/** Client-side helpers for notice file download / view. */

export async function downloadNoticeFile(
  noticeId: string,
  format: "docx" | "pdf" | "xlsx" = "docx"
): Promise<void> {
  const res = await fetch(`/api/notices/${noticeId}/download?format=${format}`, {
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

/** Open notice PDF in a new tab (inline preview). */
export function viewNoticeInNewTab(noticeId: string): void {
  window.open(`/notices/${noticeId}/view`, "_blank", "noopener,noreferrer");
}
